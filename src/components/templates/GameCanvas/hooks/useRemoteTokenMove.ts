import { useMutation } from "convex/react";
import { usePostHog } from "@posthog/react";
import { useRef } from "react";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function useRemoteTokenMove(sceneId?: string | null, remotePlayerId?: string | null) {
  const posthog = usePostHog();
  const moveTokenMutation = useMutation(api.players.moveToken);
  const lastRemoteMoveSuccessAtRef = useRef(0);

  return (tokenId: string, x: number, y: number) => {
    if (!sceneId || !remotePlayerId) return;
    void (async () => {
      try {
        await moveTokenMutation({
          sceneId: sceneId as Id<"scenes">,
          playerId: remotePlayerId,
          tokenId,
          x,
          y,
        });
        const now = Date.now();
        if (now - lastRemoteMoveSuccessAtRef.current >= 30_000) {
          posthog.capture(ANALYTICS_EVENTS.RemotePlayerTokenMoveSucceeded);
          lastRemoteMoveSuccessAtRef.current = now;
        }
      } catch (error) {
        posthog.capture(ANALYTICS_EVENTS.RemotePlayerTokenMoveFailed, {
          error_category: error instanceof Error ? error.message.slice(0, 120) : "unknown",
        });
      }
    })();
  };
}
