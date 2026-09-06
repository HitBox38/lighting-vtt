import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";

import type {
  DiagnosticSeverity,
  EffectDiagnostic,
} from "@/lib/effects/effectRegistry";
import type { EffectBackend } from "@/lib/effects/shaderContract";
import { cn } from "@/lib/utils";

/** Compile pipeline state for the preview, as the page tracks it. */
export type CompileStatus =
  | { kind: "idle" }
  | { kind: "compiling" }
  | { kind: "ok"; backend: EffectBackend }
  | { kind: "missing-program"; backend: EffectBackend }
  | { kind: "error"; backend: EffectBackend }
  | { kind: "running" }
  | { kind: "script-ok"; elapsedMs: number }
  | { kind: "script-error" };

interface Props {
  status: CompileStatus;
  diagnostics: readonly EffectDiagnostic[];
  onSelect: (diagnostic: EffectDiagnostic) => void;
}

const SEVERITY_ORDER: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function SeverityIcon({ severity }: { severity: DiagnosticSeverity }) {
  switch (severity) {
    case "error":
      return <XCircle className="text-destructive h-3.5 w-3.5 shrink-0" />;
    case "warning":
      return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />;
    case "info":
      return <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />;
    default: {
      const exhaustive: never = severity;
      throw new Error(`Unhandled severity: ${String(exhaustive)}`);
    }
  }
}

function StatusLine({
  status,
  count,
}: {
  status: CompileStatus;
  count: number;
}) {
  switch (status.kind) {
    case "idle":
      return (
        <span className="text-muted-foreground">
          Waiting for the preview renderer…
        </span>
      );
    case "compiling":
      return (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Compiling…
        </span>
      );
    case "ok":
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Compiled on{" "}
          {status.backend === "webgpu" ? "WebGPU" : "WebGL"}
          {count > 0 ? (
            <span className="text-muted-foreground">
              · {count} note{count === 1 ? "" : "s"}
            </span>
          ) : null}
        </span>
      );
    case "missing-program":
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" /> No program for{" "}
          {status.backend === "webgpu" ? "WebGPU" : "WebGL"}; preview shows the
          fallback circle
        </span>
      );
    case "error":
      return (
        <span className="text-destructive inline-flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5" /> Compile failed on{" "}
          {status.backend === "webgpu" ? "WebGPU" : "WebGL"}
        </span>
      );
    case "running":
      return (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running script…
        </span>
      );
    case "script-ok":
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Script ran in{" "}
          {status.elapsedMs.toFixed(1)} ms
          {count > 0 ? (
            <span className="text-muted-foreground">
              · {count} note{count === 1 ? "" : "s"}
            </span>
          ) : null}
        </span>
      );
    case "script-error":
      return (
        <span className="text-destructive inline-flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5" /> Script failed
        </span>
      );
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled compile status: ${String(exhaustive)}`);
    }
  }
}

/** Lint and compile output, sorted errors first. Rows with a line jump the editor there. */
export function DiagnosticsPanel({ status, diagnostics, onSelect }: Props) {
  const sorted = diagnostics.slice().sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return (
      (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER)
    );
  });

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <StatusLine status={status} count={sorted.length} />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <li className="text-muted-foreground px-3 py-2">No problems.</li>
        ) : (
          sorted.map((diagnostic, index) => {
            const clickable = diagnostic.line !== null;
            return (
              <li key={index}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSelect(diagnostic)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-1.5 text-left",
                    clickable
                      ? "hover:bg-accent/60 cursor-pointer"
                      : "cursor-default",
                  )}
                >
                  <SeverityIcon severity={diagnostic.severity} />
                  <span className="text-muted-foreground w-14 shrink-0 font-mono uppercase">
                    {diagnostic.language}
                    {diagnostic.line !== null ? `:${diagnostic.line}` : ""}
                  </span>
                  <span className="break-words">{diagnostic.message}</span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
