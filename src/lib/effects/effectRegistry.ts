/**
 * Compiles user-authored effect definitions into pixi programs, once per
 * `effectId@version@backend`, and reports compile problems as structured
 * diagnostics instead of console noise.
 *
 * pixi compiles lazily on first draw and only *logs* failures, so a broken
 * shader would otherwise render nothing and tell nobody. We compile eagerly
 * against the real device (WebGL: compile+link a throwaway program; WebGPU:
 * `createShaderModule` + `getCompilationInfo`) and only hand pixi sources we
 * know are valid.
 */
import {
  GlProgram,
  GpuProgram,
  MeshGeometry,
  RendererType,
  Shader,
  Texture,
  UniformGroup,
  type Renderer,
  type TextureSource,
  type WebGLRenderer,
  type WebGPURenderer,
} from "pixi.js";

import { EFFECT_LIMITS, type EffectDefinition } from "@shared/effects";
import {
  assembleGlslFragment,
  assembleWgsl,
  EFFECT_RESOURCE_NAMES,
  GLSL_VERTEX,
  lintAuthorSource,
  toAuthorLine,
  WGSL_FRAGMENT_ENTRY,
  WGSL_VERTEX_ENTRY,
  type AssembledSource,
  type EffectBackend,
  type ShaderLanguage,
} from "./shaderContract";
import type { DiagnosticSeverity, EffectDiagnostic } from "./diagnostics";
import { backendLanguage, hasShaderSource } from "./compatibility";
export { backendLanguage } from "./compatibility";

// Re-exported so existing callers keep one import path for compile results and their diagnostics.
export type { DiagnosticSeverity, EffectDiagnostic } from "./diagnostics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompiledEffect =
  | {
      status: "ok";
      backend: EffectBackend;
      glProgram: GlProgram | null;
      gpuProgram: GpuProgram | null;
      warnings: EffectDiagnostic[];
    }
  | {
      /** The definition has no program for the active backend (e.g. WGSL only on WebGL). */
      status: "missing-program";
      backend: EffectBackend;
      language: ShaderLanguage;
    }
  | {
      status: "error";
      backend: EffectBackend;
      diagnostics: EffectDiagnostic[];
    };

// ---------------------------------------------------------------------------
// Backend detection
// ---------------------------------------------------------------------------

export function getEffectBackend(renderer: Renderer): EffectBackend {
  return renderer.type === RendererType.WEBGPU ? "webgpu" : "webgl";
}

// ---------------------------------------------------------------------------
// Cache keys
// ---------------------------------------------------------------------------

export function effectCacheKey(effectId: string, version: number, backend: EffectBackend): string {
  return `${effectId}@${version}@${backend}`;
}

/** FNV-1a; good enough to key an in-memory cache by source text. */
function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Key for unsaved editor previews, derived from the program sources. */
export function previewCacheKey(definition: EffectDefinition, backend: EffectBackend): string {
  return `preview:${hashText(`${definition.wgsl}\u0000${definition.glsl ?? ""}`)}@${backend}`;
}

// ---------------------------------------------------------------------------
// Diagnostics helpers
// ---------------------------------------------------------------------------

const AUTHOR_START_MARKER = "// ---- author code starts on the next line ----";

/**
 * pixi rewrites GLSL before compiling (adds #version, precision, defines), so
 * line numbers in a driver log refer to the rewritten text. Locate our marker
 * in whatever text was actually compiled to recover the author's offset.
 */
function remapForProcessedSource(assembled: AssembledSource, processedSource: string): AssembledSource {
  const markerIndex = processedSource.indexOf(AUTHOR_START_MARKER);
  if (markerIndex === -1) return assembled;
  let line = 1;
  for (let i = 0; i < markerIndex; i++) {
    if (processedSource.charCodeAt(i) === 10) line++;
  }
  return { ...assembled, source: processedSource, authorStartLine: line + 1 };
}

function lintDiagnostics(language: ShaderLanguage, source: string): EffectDiagnostic[] {
  return lintAuthorSource(language, source).map((token) => ({
    severity: "error",
    message: `\`${token.token}\`: ${token.reason}`,
    line: token.line,
    language,
  }));
}

function sourceTooLong(language: ShaderLanguage, source: string): EffectDiagnostic | null {
  if (source.length <= EFFECT_LIMITS.maxSourceLength) return null;
  return {
    severity: "error",
    message: `Source is ${source.length} characters; the limit is ${EFFECT_LIMITS.maxSourceLength}.`,
    line: null,
    language,
  };
}

// ---------------------------------------------------------------------------
// WebGPU compile
// ---------------------------------------------------------------------------

function mapGpuMessageType(type: GPUCompilationMessageType): DiagnosticSeverity {
  switch (type) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled GPU compilation message type: ${String(exhaustive)}`);
    }
  }
}

async function compileWgsl(renderer: WebGPURenderer, definition: EffectDefinition, name: string): Promise<CompiledEffect> {
  const backend: EffectBackend = "webgpu";
  const tooLong = sourceTooLong("wgsl", definition.wgsl);
  if (tooLong) return { status: "error", backend, diagnostics: [tooLong] };

  const lint = lintDiagnostics("wgsl", definition.wgsl);
  if (lint.length > 0) return { status: "error", backend, diagnostics: lint };

  const assembled = assembleWgsl(definition.wgsl);
  const device = renderer.gpu.device;

  device.pushErrorScope("validation");
  const module = device.createShaderModule({ code: assembled.source, label: `effect:${name}` });
  const info = await module.getCompilationInfo();
  const scopeError = await device.popErrorScope();

  const diagnostics: EffectDiagnostic[] = info.messages.map((message) => ({
    severity: mapGpuMessageType(message.type),
    message: message.message,
    line: message.lineNum > 0 ? toAuthorLine(assembled, message.lineNum) : null,
    language: "wgsl",
  }));
  if (scopeError && !diagnostics.some((d) => d.severity === "error")) {
    diagnostics.push({ severity: "error", message: scopeError.message, line: null, language: "wgsl" });
  }

  if (diagnostics.some((d) => d.severity === "error")) {
    return { status: "error", backend, diagnostics };
  }

  let gpuProgram: GpuProgram;
  try {
    gpuProgram = new GpuProgram({
      name: `effect:${name}`,
      vertex: { source: assembled.source, entryPoint: WGSL_VERTEX_ENTRY },
      fragment: { source: assembled.source, entryPoint: WGSL_FRAGMENT_ENTRY },
    });
  } catch (error) {
    return {
      status: "error",
      backend,
      diagnostics: [
        {
          severity: "error",
          message: `pixi could not read the program layout: ${error instanceof Error ? error.message : String(error)}`,
          line: null,
          language: "wgsl",
        },
      ],
    };
  }

  return { status: "ok", backend, glProgram: null, gpuProgram, warnings: diagnostics };
}

// ---------------------------------------------------------------------------
// WebGL compile
// ---------------------------------------------------------------------------

// ANGLE / Mesa: "ERROR: 0:12: 'x' : undeclared identifier"
const GL_LOG_ANGLE = /^(ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/;
// NVIDIA: "0(12) : error C0000: syntax error"
const GL_LOG_NVIDIA = /^\d+\((\d+)\)\s*:\s*(error|warning)\s*(.*)$/i;

function parseGlLog(log: string, assembled: AssembledSource, language: ShaderLanguage): EffectDiagnostic[] {
  const out: EffectDiagnostic[] = [];
  const seen = new Set<string>();
  const push = (diagnostic: EffectDiagnostic) => {
    // ANGLE repeats the same message for each token it re-lexes; one is enough.
    const key = `${diagnostic.severity}|${diagnostic.line}|${diagnostic.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(diagnostic);
  };

  for (const rawLine of log.split("\n")) {
    // ANGLE terminates its log with a NUL byte; treat it as whitespace.
    const line = rawLine.replace(/\0/g, "").trim();
    if (!line) continue;

    let match = GL_LOG_ANGLE.exec(line);
    if (match) {
      push({
        severity: match[1] === "ERROR" ? "error" : "warning",
        message: match[3],
        line: toAuthorLine(assembled, parseInt(match[2], 10)),
        language,
      });
      continue;
    }
    match = GL_LOG_NVIDIA.exec(line);
    if (match) {
      push({
        severity: match[2].toLowerCase() === "error" ? "error" : "warning",
        message: match[3],
        line: toAuthorLine(assembled, parseInt(match[1], 10)),
        language,
      });
      continue;
    }
    push({ severity: "error", message: line, line: null, language });
  }
  if (out.length === 0) {
    out.push({ severity: "error", message: "Shader failed to compile (no driver log).", line: null, language });
  }
  return out;
}

function compileGlsl(renderer: WebGLRenderer, definition: EffectDefinition, name: string): CompiledEffect {
  const backend: EffectBackend = "webgl";
  const glsl = definition.glsl;
  if (!glsl || glsl.trim().length === 0) {
    return { status: "missing-program", backend, language: "glsl" };
  }

  const tooLong = sourceTooLong("glsl", glsl);
  if (tooLong) return { status: "error", backend, diagnostics: [tooLong] };

  const lint = lintDiagnostics("glsl", glsl);
  if (lint.length > 0) return { status: "error", backend, diagnostics: lint };

  const assembled = assembleGlslFragment(glsl);
  const glProgram = new GlProgram({ name: `effect:${name}`, vertex: GLSL_VERTEX, fragment: assembled.source });
  // Pixi preprocesses both sources (precision headers, defines). We compile exactly what it will feed the GPU.
  const processedVertex = glProgram.vertex ?? GLSL_VERTEX;
  const processedFragment = glProgram.fragment ?? assembled.source;
  const processed = remapForProcessedSource(assembled, processedFragment);

  const gl = renderer.gl;
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertexShader || !fragmentShader || !program) {
    return {
      status: "error",
      backend,
      diagnostics: [{ severity: "error", message: "WebGL context is unavailable.", line: null, language: "glsl" }],
    };
  }

  try {
    gl.shaderSource(vertexShader, processedVertex);
    gl.compileShader(vertexShader);
    gl.shaderSource(fragmentShader, processedFragment);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(fragmentShader) ?? "";
      return { status: "error", backend, diagnostics: parseGlLog(log, processed, "glsl") };
    }
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      // Our own vertex program; not the author's fault, but never swallow it.
      const log = gl.getShaderInfoLog(vertexShader) ?? "";
      return {
        status: "error",
        backend,
        diagnostics: [{ severity: "error", message: `Runtime vertex program failed: ${log}`, line: null, language: "glsl" }],
      };
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "";
      return {
        status: "error",
        backend,
        diagnostics: [{ severity: "error", message: `Program failed to link: ${log || "no driver log"}`, line: null, language: "glsl" }],
      };
    }

    const warningLog = gl.getShaderInfoLog(fragmentShader) ?? "";
    const warnings = warningLog.trim() ? parseGlLog(warningLog, processed, "glsl").filter((d) => d.severity !== "error") : [];
    return { status: "ok", backend, glProgram, gpuProgram: null, warnings };
  } finally {
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }
}

// ---------------------------------------------------------------------------
// Public compile entry point
// ---------------------------------------------------------------------------

/** Compiles `definition` for the renderer's active backend. Never throws. */
export async function compileEffect(renderer: Renderer, definition: EffectDefinition, name = definition.name): Promise<CompiledEffect> {
  const backend = getEffectBackend(renderer);
  const language = backendLanguage(backend);
  if (!hasShaderSource(definition[language])) {
    return { status: "missing-program", backend, language };
  }
  try {
    switch (backend) {
      case "webgpu":
        return await compileWgsl(renderer as WebGPURenderer, definition, name);
      case "webgl":
        return compileGlsl(renderer as WebGLRenderer, definition, name);
      default: {
        const exhaustive: never = backend;
        throw new Error(`Unhandled backend: ${String(exhaustive)}`);
      }
    }
  } catch (error) {
    return {
      status: "error",
      backend,
      diagnostics: [
        {
          severity: "error",
          message: error instanceof Error ? error.message : String(error),
          line: null,
          language: backendLanguage(backend),
        },
      ],
    };
  }
}

// ---------------------------------------------------------------------------
// Registry (cache + in-flight dedupe)
// ---------------------------------------------------------------------------

class EffectRegistry {
  private readonly compiled = new Map<string, CompiledEffect>();
  private readonly inFlight = new Map<string, Promise<CompiledEffect>>();

  /** Cached result if present; does not compile. */
  peek(key: string): CompiledEffect | undefined {
    return this.compiled.get(key);
  }

  /** Compiles once per key; concurrent callers share the same promise. */
  get(key: string, renderer: Renderer, definition: EffectDefinition): Promise<CompiledEffect> {
    const cached = this.compiled.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = compileEffect(renderer, definition).then((result) => {
      // A clear() during compile means the device changed; do not cache stale programs.
      if (this.inFlight.get(key) === promise) {
        this.compiled.set(key, result);
        this.inFlight.delete(key);
      }
      return result;
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    const entry = this.compiled.get(key);
    if (entry?.status === "ok") {
      entry.glProgram?.destroy();
      entry.gpuProgram?.destroy();
    }
    this.compiled.delete(key);
    this.inFlight.delete(key);
  }

  /** Drop everything, e.g. after a lost GPU context. Programs are recompiled on demand. */
  clear(): void {
    for (const key of Array.from(this.compiled.keys())) {
      this.invalidate(key);
    }
    this.inFlight.clear();
  }

  /** Evict preview entries so editor recompiles do not grow unbounded. */
  clearPreviews(): void {
    for (const key of Array.from(this.compiled.keys())) {
      if (key.startsWith("preview:")) this.invalidate(key);
    }
  }
}

export const effectRegistry = new EffectRegistry();

// ---------------------------------------------------------------------------
// Per-instance shader + uniforms
// ---------------------------------------------------------------------------

export interface EffectUniformValues {
  uParams: Float32Array;
  uCenter: Float32Array;
  uMapSize: Float32Array;
  uViewport: Float32Array;
  uTime: number;
  uRadius: number;
  uRotation: number;
}

export type EffectUniformGroup = UniformGroup<{
  uParams: { value: Float32Array; type: "vec4<f32>"; size: number };
  uCenter: { value: Float32Array; type: "vec2<f32>" };
  uMapSize: { value: Float32Array; type: "vec2<f32>" };
  uViewport: { value: Float32Array; type: "vec2<f32>" };
  uTime: { value: number; type: "f32" };
  uRadius: { value: number; type: "f32" };
  uRotation: { value: number; type: "f32" };
}>;

/**
 * Builds the per-instance uniform group. Member order must match the
 * `EffectUniforms` struct in shaderContract.ts (see the note there).
 */
export function createEffectUniforms(): EffectUniformGroup {
  return new UniformGroup({
    uParams: { value: new Float32Array(EFFECT_LIMITS.maxParams * 4), type: "vec4<f32>", size: EFFECT_LIMITS.maxParams },
    uCenter: { value: new Float32Array(2), type: "vec2<f32>" },
    uMapSize: { value: new Float32Array(2), type: "vec2<f32>" },
    uViewport: { value: new Float32Array(2), type: "vec2<f32>" },
    uTime: { value: 0, type: "f32" },
    uRadius: { value: 1, type: "f32" },
    uRotation: { value: 0, type: "f32" },
  });
}

export interface EffectShaderHandle {
  shader: Shader;
  uniforms: EffectUniformGroup;
  setMap: (source: TextureSource) => void;
  destroy: () => void;
}

/**
 * One `Shader` per instance so every instance owns its uniforms; the compiled
 * program underneath is shared and cached by pixi.
 */
export function createEffectShader(compiled: Extract<CompiledEffect, { status: "ok" }>, mapSource: TextureSource = Texture.WHITE.source): EffectShaderHandle {
  const uniforms = createEffectUniforms();
  const resources = {
    [EFFECT_RESOURCE_NAMES.uniforms]: uniforms,
    [EFFECT_RESOURCE_NAMES.map]: mapSource,
    [EFFECT_RESOURCE_NAMES.mapSampler]: mapSource.style,
  };

  let shader: Shader;
  if (compiled.gpuProgram && compiled.glProgram) {
    shader = new Shader({ gpuProgram: compiled.gpuProgram, glProgram: compiled.glProgram, resources });
  } else if (compiled.gpuProgram) {
    shader = new Shader({ gpuProgram: compiled.gpuProgram, resources });
  } else if (compiled.glProgram) {
    shader = new Shader({ glProgram: compiled.glProgram, resources });
  } else {
    throw new Error("Compiled effect has no program for any backend");
  }

  return {
    shader,
    uniforms,
    setMap: (source) => {
      shader.resources[EFFECT_RESOURCE_NAMES.map] = source;
      shader.resources[EFFECT_RESOURCE_NAMES.mapSampler] = source.style;
    },
    destroy: () => {
      // Programs are owned by the registry; only drop this instance's shader + uniforms.
      shader.destroy(false);
    },
  };
}

// ---------------------------------------------------------------------------
// Shared unit quad
// ---------------------------------------------------------------------------

let unitQuad: MeshGeometry | null = null;

/** A -1..1 quad shared by every effect mesh; scale = radius places it in map space. */
export function getEffectQuadGeometry(): MeshGeometry {
  if (!unitQuad) {
    unitQuad = new MeshGeometry({
      positions: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
  }
  return unitQuad;
}

/** Forget the shared quad after a context loss so the next frame rebuilds GPU buffers. */
export function resetEffectQuadGeometry(): void {
  unitQuad?.destroy();
  unitQuad = null;
}
