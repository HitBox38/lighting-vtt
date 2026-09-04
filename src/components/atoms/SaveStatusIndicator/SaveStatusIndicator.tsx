import { CheckCircle2, CloudOff, Loader2 } from "lucide-react";

import { HUD_SURFACE_CLASSNAME } from "@/components/atoms/HudSurface/constants";
import type { SaveStatus } from "@/components/atoms/SaveStatusIndicator/types";
import { cn } from "@/lib/utils";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
}

const statusContent = (status: Exclude<SaveStatus, "idle">) => {
  switch (status) {
    case "saving":
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      );
    case "saved":
      return (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-green-500">Saved</span>
        </>
      );
    case "error":
      return (
        <>
          <CloudOff className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      );
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
};

export function SaveStatusIndicator({ status, className }: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(HUD_SURFACE_CLASSNAME, "items-center gap-1.5 px-3 py-1.5 text-sm", className)}>
      {statusContent(status)}
    </div>
  );
}
