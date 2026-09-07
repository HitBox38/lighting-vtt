import type { CompileStatus } from "../DiagnosticsPanel";

/** Missing optional programs are compatible fallbacks, not save failures. */
export function previewSaveBlocker(
  status: CompileStatus,
  pendingPreview: boolean,
  isScript: boolean,
  hasTypeScriptErrors: boolean,
): string | null {
  if (pendingPreview || ["compiling", "running", "idle"].includes(status.kind)) {
    return isScript ? "Waiting for the preview to run." : "Waiting for the preview to compile.";
  }
  if (hasTypeScriptErrors || status.kind === "error" || status.kind === "script-error") {
    return isScript ? "The script fails in the preview." : "The shader does not compile on this machine.";
  }
  return null;
}
