import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { readGuestPlayerToken } from "@/lib/playerSession";

/** Wait for account authentication and attach only this tab's scoped guest proof. */
export function useSceneQuery(sceneId: string | null | undefined, playerId?: string | null) {
  const { isLoading } = useConvexAuth();
  return useQuery(api.scenes.getById, sceneId && !isLoading ? {
    id: sceneId as Id<"scenes">,
    playerId: playerId ?? undefined,
    guestToken: playerId ? readGuestPlayerToken(sceneId, playerId) : undefined,
  } : "skip");
}
