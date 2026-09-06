/**
 * Runs user-authored script effects where they cannot hurt anyone.
 *
 * Layout:
 *
 *   main window ──postMessage──▶ sandboxed iframe (srcdoc, opaque origin, CSP)
 *                                    └── one module Worker per loaded script
 *
 * The iframe has `sandbox="allow-scripts"` only, so it has no origin: no
 * cookies, no storage, no same-origin fetch. Its CSP allows exactly two
 * things, our inline bootstrap (by nonce) and `blob:` scripts, and forbids
 * every network destination. Workers created from blob URLs inherit that CSP.
 * Each script gets its own Worker so a hung script is terminated without
 * touching the others, and the worker bootstrap deletes the network and
 * storage globals before the author's module is imported.
 *
 * The bootstrap worker is a classic worker on purpose: Chromium refuses to
 * start `{ type: "module" }` workers from `blob:` URLs inside an opaque
 * origin (the `error` event fires with no message). Dynamic `import()` of a
 * blob module from a classic worker works everywhere we target, so the
 * author's code is still an ES module.
 *
 * Everything the host receives back is untrusted and goes through
 * `sanitizeScriptOutput`; request ids are random so a script cannot forge a
 * reply for a request it did not see.
 */
import type { GeometryOutput } from "@/lib/geometry";

import type { EffectDiagnostic } from "./diagnostics";
import { SCRIPT_LIMITS, sanitizeScriptOutput, type ScriptEffectInput } from "./scriptContract";

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export type ScriptLoadResult = { status: "ok" } | { status: "error"; diagnostics: EffectDiagnostic[] };

export type ScriptComputeResult =
  | { status: "ok"; geometry: GeometryOutput; elapsedMs: number; warnings: EffectDiagnostic[] }
  | {
      status: "error";
      diagnostics: EffectDiagnostic[];
      /** True when the module was torn down (hang, budget overrun, crash) and must be loaded again. */
      fatal: boolean;
    };

// ---------------------------------------------------------------------------
// Wire protocol
// ---------------------------------------------------------------------------

type HostToFrame =
  | { type: "load"; moduleId: string; source: string }
  | { type: "compute"; moduleId: string; requestId: string; input: ScriptEffectInput }
  | { type: "unload"; moduleId: string };

/** Shape we expect back. Every field is re-validated on receipt; the sender is not trusted. */
type FrameToHost =
  | { type: "ready" }
  | { type: "loaded"; moduleId: string }
  | { type: "load-failed"; moduleId: string; message: string; line: number | null }
  | { type: "computed"; moduleId: string; requestId: string; output: unknown; elapsedMs: number }
  | { type: "compute-failed"; moduleId: string; requestId: string; message: string; line: number | null }
  | { type: "worker-error"; moduleId: string; message: string };

// ---------------------------------------------------------------------------
// Worker bootstrap (runs inside the sandbox, before the author's module)
// ---------------------------------------------------------------------------

const WORKER_SOURCE = /* js */ `
const post = self.postMessage.bind(self);
const scope = self;
let moduleId = null;
let compute = null;

// CSP already blocks the network; removing the handles too means a script
// cannot even probe for them. Walk the prototype chain because most of these
// live on WorkerGlobalScope.prototype, not on the instance. This is a classic
// worker, so importScripts exists and must go too.
const BLOCKED = [
  "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport", "RTCPeerConnection",
  "importScripts", "indexedDB", "caches", "BroadcastChannel", "SharedWorker", "Worker",
  "navigator", "OffscreenCanvas", "createImageBitmap", "FileReaderSync", "FileSystemHandle",
  "showOpenFilePicker", "showSaveFilePicker", "showDirectoryPicker",
];
for (const name of BLOCKED) {
  let target = scope;
  while (target) {
    if (Object.prototype.hasOwnProperty.call(target, name)) {
      try { delete target[name]; } catch (_) { /* non-configurable; the defineProperty below still shadows it */ }
    }
    target = Object.getPrototypeOf(target);
  }
  try {
    Object.defineProperty(scope, name, { value: undefined, writable: false, configurable: false, enumerable: false });
  } catch (_) { /* already frozen by the platform */ }
}

function describeError(error) {
  const message = error instanceof Error ? error.name + ": " + error.message : String(error);
  let line = null;
  if (error && typeof error.lineNumber === "number") {
    line = error.lineNumber;
  } else if (error && typeof error.stack === "string") {
    // Chrome: "at compute (blob:null/uuid:12:7)"; Firefox: "compute@blob:null/uuid:12:7".
    const match = /blob:[^\\s)]*?:(\\d+):(\\d+)/.exec(error.stack);
    if (match) line = Number(match[1]);
  }
  return { message, line };
}

async function handleLoad(msg) {
  moduleId = msg.moduleId;
  compute = null;
  let url = null;
  try {
    url = URL.createObjectURL(new Blob([msg.source], { type: "text/javascript" }));
    const mod = await import(url);
    if (typeof mod.compute !== "function") {
      throw new TypeError("the module does not export a compute() function");
    }
    compute = mod.compute;
    post({ type: "loaded", moduleId });
  } catch (error) {
    const described = describeError(error);
    post({ type: "load-failed", moduleId, message: described.message, line: described.line });
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

function handleCompute(msg) {
  const requestId = msg.requestId;
  if (typeof compute !== "function") {
    post({ type: "compute-failed", moduleId, requestId, message: "the module is not loaded", line: null });
    return;
  }
  const started = performance.now();
  let output;
  try {
    output = compute(msg.input);
  } catch (error) {
    const described = describeError(error);
    post({ type: "compute-failed", moduleId, requestId, message: described.message, line: described.line });
    return;
  }
  const elapsedMs = performance.now() - started;
  if (output && typeof output.then === "function") {
    post({ type: "compute-failed", moduleId, requestId, message: "compute() returned a promise; it must be synchronous", line: null });
    return;
  }
  try {
    post({ type: "computed", moduleId, requestId, output, elapsedMs });
  } catch (error) {
    // DataCloneError: functions, class instances, cyclic structures.
    post({ type: "compute-failed", moduleId, requestId, message: "compute() returned a value that cannot be transferred: " + describeError(error).message, line: null });
  }
}

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "load") void handleLoad(msg);
  else if (msg.type === "compute") handleCompute(msg);
});
`;

// ---------------------------------------------------------------------------
// Iframe bootstrap (trusted relay between the host window and the workers)
// ---------------------------------------------------------------------------

function buildFrameDocument(nonce: string): string {
  // `<` must never appear literally inside an inline script; it could end the tag early.
  const workerSourceLiteral = JSON.stringify(WORKER_SOURCE).replace(/</g, "\\u003c");
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' blob:`,
    "worker-src blob:",
    "connect-src 'none'",
    "img-src 'none'",
    "style-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  const bootstrap = /* js */ `
(() => {
  const WORKER_SOURCE = ${workerSourceLiteral};
  const workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  const workers = new Map();
  const reply = (message) => parent.postMessage(message, "*");

  window.addEventListener("message", (event) => {
    if (event.source !== parent) return;
    const msg = event.data;
    if (!msg || typeof msg !== "object" || typeof msg.moduleId !== "string") return;
    switch (msg.type) {
      case "load": {
        const existing = workers.get(msg.moduleId);
        if (existing) existing.terminate();
        let worker;
        try {
          worker = new Worker(workerUrl, { name: msg.moduleId });
        } catch (error) {
          reply({ type: "load-failed", moduleId: msg.moduleId, message: "Could not start the sandbox worker: " + String(error && error.message || error), line: null });
          return;
        }
        worker.addEventListener("message", (e) => reply(e.data));
        worker.addEventListener("error", (e) => {
          e.preventDefault();
          const where = e.lineno ? " (line " + e.lineno + ")" : "";
          reply({ type: "worker-error", moduleId: msg.moduleId, message: (e.message || "the worker failed to start") + where });
        });
        workers.set(msg.moduleId, worker);
        worker.postMessage(msg);
        return;
      }
      case "compute": {
        const worker = workers.get(msg.moduleId);
        if (!worker) {
          reply({ type: "compute-failed", moduleId: msg.moduleId, requestId: msg.requestId, message: "the module is not loaded", line: null });
          return;
        }
        worker.postMessage(msg);
        return;
      }
      case "unload": {
        const worker = workers.get(msg.moduleId);
        if (worker) {
          worker.terminate();
          workers.delete(msg.moduleId);
        }
        return;
      }
    }
  });

  reply({ type: "ready" });
})();
`;

  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `</head><body><script nonce="${nonce}">${bootstrap}</script></body></html>`
  );
}

// ---------------------------------------------------------------------------
// Host
// ---------------------------------------------------------------------------

type ModuleState =
  | { status: "loading"; source: string; promise: Promise<ScriptLoadResult>; resolve: (result: ScriptLoadResult) => void; timer: number }
  | { status: "ready"; source: string }
  | { status: "failed"; source: string; diagnostics: EffectDiagnostic[] };

interface PendingCompute {
  moduleId: string;
  resolve: (result: ScriptComputeResult) => void;
  timer: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readLine(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function readMessage(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value.slice(0, 2000) : fallback;
}

function errorDiagnostic(message: string, line: number | null = null): EffectDiagnostic {
  return { severity: "error", message, line, language: "js" };
}

function fatal(message: string, line: number | null = null): ScriptComputeResult {
  return { status: "error", fatal: true, diagnostics: [errorDiagnostic(message, line)] };
}

export class ScriptSandbox {
  private readonly iframe: HTMLIFrameElement;
  private readonly ready: Promise<void>;
  private resolveReady: (() => void) | null = null;
  private readonly modules = new Map<string, ModuleState>();
  private readonly pending = new Map<string, PendingCompute>();
  private disposed = false;

  private readonly onMessage = (event: MessageEvent<unknown>) => {
    if (event.source !== this.iframe.contentWindow) return;
    this.handleFrameMessage(event.data);
  };

  constructor() {
    if (typeof document === "undefined") {
      throw new Error("ScriptSandbox requires a DOM");
    }
    this.ready = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });

    const iframe = document.createElement("iframe");
    // `allow-scripts` alone: no same-origin, no forms, no popups, no top navigation.
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none";
    iframe.srcdoc = buildFrameDocument(crypto.randomUUID());
    this.iframe = iframe;

    window.addEventListener("message", this.onMessage);
    document.body.appendChild(iframe);
  }

  /**
   * Loads (or reloads, when the source changed) a script under `moduleId`.
   * Resolves once the module exports `compute`, or with the reason it did not.
   */
  load(moduleId: string, source: string): Promise<ScriptLoadResult> {
    if (this.disposed) return Promise.resolve({ status: "error", diagnostics: [errorDiagnostic("The script sandbox was shut down.")] });

    const existing = this.modules.get(moduleId);
    if (existing && existing.source === source) {
      switch (existing.status) {
        case "loading":
          return existing.promise;
        case "ready":
          return Promise.resolve({ status: "ok" });
        case "failed":
          return Promise.resolve({ status: "error", diagnostics: existing.diagnostics });
        default: {
          const exhaustive: never = existing;
          throw new Error(`Unhandled module state: ${String(exhaustive)}`);
        }
      }
    }
    if (existing) this.unload(moduleId);

    let resolve: (result: ScriptLoadResult) => void = () => {};
    const promise = new Promise<ScriptLoadResult>((r) => {
      resolve = r;
    });
    const timer = window.setTimeout(() => {
      this.failModule(moduleId, [
        errorDiagnostic(`The script did not finish loading within ${SCRIPT_LIMITS.loadTimeoutMs}ms. Top-level code must not block.`),
      ]);
    }, SCRIPT_LIMITS.loadTimeoutMs);
    this.modules.set(moduleId, { status: "loading", source, promise, resolve, timer });

    void this.ready.then(() => {
      if (this.modules.get(moduleId)?.status !== "loading") return;
      this.send({ type: "load", moduleId, source });
    });
    return promise;
  }

  /** Runs `compute` for one instance. Waits for a pending load of the same module first. */
  async compute(moduleId: string, input: ScriptEffectInput): Promise<ScriptComputeResult> {
    if (this.disposed) return fatal("The script sandbox was shut down.");
    const state = this.modules.get(moduleId);
    if (!state) return fatal("The script is not loaded.");
    if (state.status === "loading") {
      const loaded = await state.promise;
      if (loaded.status === "error") return { status: "error", fatal: true, diagnostics: loaded.diagnostics };
    } else if (state.status === "failed") {
      return { status: "error", fatal: true, diagnostics: state.diagnostics };
    }
    if (this.disposed) return fatal("The script sandbox was shut down.");

    const requestId = crypto.randomUUID();
    return new Promise<ScriptComputeResult>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        this.failModule(moduleId, [
          errorDiagnostic(
            `compute() did not return within ${SCRIPT_LIMITS.computeHangMs}ms and was terminated. Check for infinite loops.`,
          ),
        ]);
        resolve(fatal(`compute() did not return within ${SCRIPT_LIMITS.computeHangMs}ms and was terminated.`));
      }, SCRIPT_LIMITS.computeHangMs);
      this.pending.set(requestId, { moduleId, resolve, timer });
      this.send({ type: "compute", moduleId, requestId, input });
    });
  }

  /** Terminates the module's worker and forgets it. Safe to call for unknown ids. */
  unload(moduleId: string): void {
    const state = this.modules.get(moduleId);
    if (!state) return;
    this.modules.delete(moduleId);
    if (state.status === "loading") {
      window.clearTimeout(state.timer);
      state.resolve({ status: "error", diagnostics: [errorDiagnostic("The script was unloaded before it finished loading.")] });
    }
    this.rejectPending(moduleId, fatal("The script was unloaded."));
    if (!this.disposed) this.send({ type: "unload", moduleId });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const moduleId of Array.from(this.modules.keys())) this.unload(moduleId);
    window.removeEventListener("message", this.onMessage);
    this.iframe.remove();
    this.resolveReady?.();
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private send(message: HostToFrame): void {
    // Opaque origin: "*" is the only target that matches. The iframe filters on `event.source`.
    this.iframe.contentWindow?.postMessage(message, "*");
  }

  private failModule(moduleId: string, diagnostics: EffectDiagnostic[]): void {
    const state = this.modules.get(moduleId);
    if (!state) return;
    if (state.status === "loading") {
      window.clearTimeout(state.timer);
      state.resolve({ status: "error", diagnostics });
    }
    this.modules.set(moduleId, { status: "failed", source: state.source, diagnostics });
    this.rejectPending(moduleId, { status: "error", fatal: true, diagnostics });
    if (!this.disposed) this.send({ type: "unload", moduleId });
  }

  private rejectPending(moduleId: string, result: ScriptComputeResult): void {
    for (const [requestId, request] of Array.from(this.pending)) {
      if (request.moduleId !== moduleId) continue;
      window.clearTimeout(request.timer);
      this.pending.delete(requestId);
      request.resolve(result);
    }
  }

  /** Pops the pending request a reply refers to, or null when it is stale or forged. */
  private takePending(requestId: unknown): PendingCompute | null {
    if (typeof requestId !== "string") return null;
    const request = this.pending.get(requestId);
    if (!request) return null;
    window.clearTimeout(request.timer);
    this.pending.delete(requestId);
    return request;
  }

  /**
   * `data` is whatever the iframe relayed, including anything the author's
   * code posted from inside the worker, so every field is checked before use.
   */
  private handleFrameMessage(data: unknown): void {
    if (!isRecord(data) || typeof data.type !== "string") return;
    const type = data.type as FrameToHost["type"];
    const moduleId = typeof data.moduleId === "string" ? data.moduleId : null;

    switch (type) {
      case "ready": {
        this.resolveReady?.();
        this.resolveReady = null;
        return;
      }
      case "loaded": {
        const state = moduleId === null ? undefined : this.modules.get(moduleId);
        if (moduleId === null || !state || state.status !== "loading") return;
        window.clearTimeout(state.timer);
        this.modules.set(moduleId, { status: "ready", source: state.source });
        state.resolve({ status: "ok" });
        return;
      }
      case "load-failed": {
        const state = moduleId === null ? undefined : this.modules.get(moduleId);
        if (moduleId === null || !state || state.status !== "loading") return;
        this.failModule(moduleId, [
          errorDiagnostic(readMessage(data.message, "The script failed to load."), readLine(data.line)),
        ]);
        return;
      }
      case "worker-error": {
        if (moduleId === null) return;
        this.failModule(moduleId, [errorDiagnostic(`Uncaught error in script: ${readMessage(data.message, "unknown error")}`)]);
        return;
      }
      case "computed": {
        const request = this.takePending(data.requestId);
        if (!request) return;
        request.resolve(this.finishCompute(request.moduleId, data.output, data.elapsedMs));
        return;
      }
      case "compute-failed": {
        const request = this.takePending(data.requestId);
        if (!request) return;
        request.resolve({
          status: "error",
          fatal: false,
          diagnostics: [errorDiagnostic(readMessage(data.message, "compute() threw."), readLine(data.line))],
        });
        return;
      }
      default: {
        // Unknown types are ignored: the worker side is not trusted to speak the protocol.
        const exhaustive: never = type;
        void exhaustive;
        return;
      }
    }
  }

  private finishCompute(moduleId: string, output: unknown, elapsedRaw: unknown): ScriptComputeResult {
    const elapsedMs = typeof elapsedRaw === "number" && Number.isFinite(elapsedRaw) ? elapsedRaw : 0;
    if (elapsedMs > SCRIPT_LIMITS.computeBudgetMs) {
      const message = `compute() took ${elapsedMs.toFixed(1)}ms; the budget is ${SCRIPT_LIMITS.computeBudgetMs}ms. The effect was stopped.`;
      this.failModule(moduleId, [errorDiagnostic(message)]);
      return fatal(message);
    }
    const sanitized = sanitizeScriptOutput(output);
    if (!sanitized.ok) {
      return { status: "error", fatal: false, diagnostics: [errorDiagnostic(`Invalid output: ${sanitized.message}`)] };
    }
    const warnings: EffectDiagnostic[] = [];
    if (elapsedMs > SCRIPT_LIMITS.computeBudgetMs / 2) {
      warnings.push({
        severity: "warning",
        line: null,
        language: "js",
        message: `compute() took ${elapsedMs.toFixed(1)}ms of the ${SCRIPT_LIMITS.computeBudgetMs}ms budget.`,
      });
    }
    return { status: "ok", geometry: sanitized.geometry, elapsedMs, warnings };
  }
}
