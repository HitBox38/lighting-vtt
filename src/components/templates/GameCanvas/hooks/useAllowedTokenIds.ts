import { useQuery } from "convex/react";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function useAllowedTokenIds(
  sceneId: string | null | undefined,
  remotePlayerId?: string | null,
) {
  const isRemotePlayer = !!remotePlayerId;
  const scene = useQuery(
    api.scenes.getById,
    sceneId ? { id: sceneId as Id<"scenes"> } : "skip",
  );

  if (!isRemotePlayer || !scene) {
    return { isRemotePlayer, allowedTokenIds: new Set<string>(), scene };
  }

  const players = (scene as Record<string, unknown>).players as
    | Array<{ id: string; tokenInstanceIds: string[] }>
    | undefined;
  const activePlayerIds = (scene as Record<string, unknown>).activePlayerIds as
    | string[]
    | undefined;
  const player = players?.find((candidate) => candidate.id === remotePlayerId);
  if (!player || !(activePlayerIds?.includes(remotePlayerId) ?? false)) {
    return { isRemotePlayer, allowedTokenIds: new Set<string>(), scene };
  }

  return {
    isRemotePlayer,
    allowedTokenIds: new Set(player.tokenInstanceIds),
    scene,
  };
}
