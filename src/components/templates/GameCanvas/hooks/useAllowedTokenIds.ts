import { useSceneQuery } from "@/lib/hooks/useSceneQuery";

export function useAllowedTokenIds(
  sceneId: string | null | undefined,
  remotePlayerId?: string | null,
) {
  const isRemotePlayer = !!remotePlayerId;
  const scene = useSceneQuery(sceneId, remotePlayerId);

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
