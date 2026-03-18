import { CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import { HUD_SURFACE_CLASSNAME } from "@/components/hud/HudSurface";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function SaveStatusIndicator({ status, className }: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        HUD_SURFACE_CLASSNAME,
        "items-center gap-1.5 px-3 py-1.5 text-sm",
        className
      )}>
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-green-500">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <CloudOff className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  );
}
