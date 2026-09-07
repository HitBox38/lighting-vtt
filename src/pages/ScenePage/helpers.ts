import type { RemotePlayerInfo } from "@/components/organisms/RemotePlayerHud/types";
import type { ScenePlayerSnapshot, SceneRole } from "@/pages/ScenePage/types";

export function resolveSceneRole(isGM: boolean, isRemotePlayer: boolean): SceneRole {
  if (isRemotePlayer) {
    return "remote_player";
  }
  if (isGM) {
    return "gm";
  }
  return "player";
}

export function getScenePlayers(scene: unknown): ScenePlayerSnapshot[] {
  if (!scene || typeof scene !== "object" || !("players" in scene)) {
    return [];
  }
  const players = (scene as { players?: unknown }).players;
  return Array.isArray(players) ? (players as ScenePlayerSnapshot[]) : [];
}

export function getActivePlayerIds(scene: unknown): string[] {
  if (!scene || typeof scene !== "object" || !("activePlayerIds" in scene)) {
    return [];
  }
  const ids = (scene as { activePlayerIds?: unknown }).activePlayerIds;
  return Array.isArray(ids) ? (ids as string[]) : [];
}

export function getDmLastSeen(scene: unknown): number | undefined {
  if (!scene || typeof scene !== "object" || !("dmLastSeen" in scene)) {
    return undefined;
  }
  const value = (scene as { dmLastSeen?: unknown }).dmLastSeen;
  return typeof value === "number" ? value : undefined;
}

export function isDmRecentlySeen(dmLastSeen: number | undefined, now: number): boolean {
  return typeof dmLastSeen === "number" && now - dmLastSeen < 45_000;
}

export function getRemotePlayerInfo(
  scene: unknown,
  remotePlayerId: string | null,
  isRemotePlayer: boolean,
): RemotePlayerInfo | null {
  if (!isRemotePlayer || !scene || !remotePlayerId) {
    return null;
  }
  const player = getScenePlayers(scene).find((candidate) => candidate.id === remotePlayerId);
  if (!player) {
    return null;
  }
  return {
    ...player,
    isActive: getActivePlayerIds(scene).includes(remotePlayerId),
  };
}
