import type { EffectInstanceStatus } from "@/stores/effectRuntimeStore/effectRuntimeStore";
import type { EffectBackend } from "@/lib/effects/shaderContract";

export interface EffectStatusText {
  label: string;
  /** Present when the GM should be told what to do about it. */
  detail: string | null;
  tone: "neutral" | "ok" | "warning" | "error";
}

export function backendLabel(backend: EffectBackend): string {
  switch (backend) {
    case "webgpu":
      return "WebGPU";
    case "webgl":
      return "WebGL";
    default: {
      const exhaustive: never = backend;
      throw new Error(`Unhandled backend: ${String(exhaustive)}`);
    }
  }
}

/** Human-readable summary of an instance's runtime status for menus and badges. */
export function describeEffectStatus(
  status: EffectInstanceStatus | undefined,
): EffectStatusText {
  if (!status) {
    return { label: "Not rendered yet", detail: null, tone: "neutral" };
  }
  switch (status.kind) {
    case "loading":
      return { label: "Loading definition", detail: null, tone: "neutral" };
    case "compiling":
      return { label: "Compiling shader", detail: null, tone: "neutral" };
    case "ok":
      return status.warnings.length > 0
        ? {
            label: `Running with ${status.warnings.length} warning${status.warnings.length === 1 ? "" : "s"}`,
            detail: status.warnings[0]?.message ?? null,
            tone: "warning",
          }
        : { label: "Running", detail: null, tone: "ok" };
    case "missing-definition":
      return {
        label: "Definition unavailable",
        detail:
          "The pinned version was deleted or is no longer shared with you. Showing a plain circle.",
        tone: "error",
      };
    case "missing-program":
      return {
        label: `No ${backendLabel(status.backend)} program`,
        detail: `This browser renders with ${backendLabel(status.backend)} and the effect ships no program for it. Showing a plain circle.`,
        tone: "warning",
      };
    case "error": {
      const first =
        status.diagnostics.find((d) => d.severity === "error") ??
        status.diagnostics[0];
      return {
        label: "Shader failed to compile",
        detail: first
          ? `${first.line !== null ? `Line ${first.line}: ` : ""}${first.message}`
          : null,
        tone: "error",
      };
    }
    case "disabled":
      return { label: "Disabled", detail: status.reason, tone: "error" };
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled status: ${String(exhaustive)}`);
    }
  }
}
