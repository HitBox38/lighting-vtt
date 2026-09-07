import { CircleCheck, CircleAlert, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CompileStatus } from "../DiagnosticsPanel";
import type { EffectBackend } from "@/lib/effects/shaderContract";

export function PreviewStatus({
  status,
  failed,
  backend,
  script,
  onDiagnostics,
}: {
  status: CompileStatus;
  failed: boolean;
  backend: EffectBackend | null;
  script: boolean;
  onDiagnostics: () => void;
}) {
  const busy = ["idle", "running", "compiling"].includes(status.kind);
  const fallback = status.kind === "missing-program";
  const label = failed
    ? "Needs attention"
    : fallback
      ? "Fallback circle"
      : busy
        ? "Updating preview"
        : script
          ? "Running"
          : "Compiled";
  const Icon = failed || fallback ? CircleAlert : busy ? Loader2 : CircleCheck;
  return (
    <div className="flex items-center gap-1.5">
      {failed && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs text-destructive"
          onClick={onDiagnostics}
        >
          View errors
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Preview status and compatibility"
            className="flex items-center gap-1.5 rounded px-1.5 py-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon
              className={`size-3 ${failed ? "text-destructive" : fallback ? "text-amber-500" : busy ? "animate-spin" : "text-emerald-500"}`}
            />
            <span>
              {label}
              {status.kind === "script-ok" && !failed
                ? ` · ${status.elapsedMs.toFixed(1)} ms`
                : ""}
            </span>
            <Info className="size-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-2 text-xs">
          <p className="font-medium">Preview compatibility</p>
          <p className="text-muted-foreground">
            {backend
              ? `${backend === "webgpu" ? "WebGPU" : "WebGL"} is the renderer observed in this browser.`
              : "Waiting for this browser’s renderer."}{" "}
            Other browsers remain untested.
          </p>
          {!script && (
            <p className="text-muted-foreground">
              Shaders use WGSL on WebGPU and GLSL on WebGL. Without GLSL, WebGL
              displays a fallback circle.
            </p>
          )}
          <Button size="sm" variant="outline" onClick={onDiagnostics}>
            Open diagnostics
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
