import { analyticsOperationGuard } from "@/lib/analyticsOperation";
import { useMutation } from "convex/react";
import { usePostHog } from "@posthog/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ANALYTICS_EVENTS, errorCategory } from "@/lib/analytics";
import { readGuestPlayerToken } from "@/lib/playerSession";

export function useRemoteTokenMove(
  sceneId?: string | null,
  remotePlayerId?: string | null,
) {
  const posthog = usePostHog();
  const moveTokenMutation = useMutation(api.players.moveToken);

  return (tokenId: string, x: number, y: number) => {
    if (!sceneId || !remotePlayerId) return;
    const measurable = analyticsOperationGuard();
    const context = { scene_id: sceneId, role: "remote_player", attempt_id: crypto.randomUUID() };
    void (async () => {
      try {
        await moveTokenMutation({
          sceneId: sceneId as Id<"scenes">,
          playerId: remotePlayerId,
          guestToken: readGuestPlayerToken(sceneId, remotePlayerId),
          tokenId,
          x,
          y,
        });
        if (measurable()) posthog.capture(ANALYTICS_EVENTS.RemotePlayerTokenMoveSucceeded, context);
      } catch (error) {
        if (measurable()) posthog.capture(ANALYTICS_EVENTS.RemotePlayerTokenMoveFailed, {
          ...context, error_category: errorCategory(error),
        });
        toast.error(error instanceof ConvexError && error.data === "PLAYER_AUTH_REQUIRED"
          ? "Sign in as this player, or rejoin as a guest using the invite link."
          : "Couldn't move the token. Check that it is your turn and the token is assigned to you.");
      }
    })();
  };
}
