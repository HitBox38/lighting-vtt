import { useCallback } from "react";
import { usePostHog } from "@posthog/react";
import { RefreshCw, X } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

interface Props {
  encounterId: string;
  sceneId: string;
  creatorId: string;
}

export function IISyncIndicator({ encounterId, sceneId, creatorId }: Props) {
  const posthog = usePostHog();
  const disableLiveSync = useAction(api.iiSync.disableLiveSync);

  const handleDisable = useCallback(async () => {
    try {
      await disableLiveSync({
        sceneId: sceneId as Id<"scenes">,
        creatorId,
      });
      posthog.capture(ANALYTICS_EVENTS.IILiveSyncDisabled);
    } catch (error) {
      console.error("Failed to disable sync:", error);
    }
  }, [sceneId, creatorId, disableLiveSync, posthog]);

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400">
      <RefreshCw className="size-3 animate-spin" />
      <span className="hidden sm:inline">Syncing</span>
      <span className="max-w-20 truncate font-mono" title={encounterId}>
        {encounterId}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-4 hover:text-red-400"
        onClick={handleDisable}
        title="Stop syncing">
        <X className="size-3" />
      </Button>
    </div>
  );
}

export default IISyncIndicator;
