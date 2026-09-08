import { useMutation } from "convex/react";
import { usePostHog } from "@posthog/react";
import { useRef } from "react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { readGuestPlayerToken } from "@/lib/playerSession";

export function useRemoteTokenMove(
  sceneId?: string | null,
  remotePlayerId?: string | null,
) {
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
          guestToken: readGuestPlayerToken(sceneId, remotePlayerId),
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
          error_category: "move_failed",
        });
        toast.error(error instanceof ConvexError && error.data === "PLAYER_AUTH_REQUIRED"
          ? "Sign in as this player, or rejoin as a guest using the invite link."
          : "Couldn't move the token. Check that it is your turn and the token is assigned to you.");
      }
    })();
  };
}
