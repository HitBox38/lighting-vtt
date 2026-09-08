import { GUEST_PLAYER_TOKEN_BYTES, isGuestPlayerToken } from "@shared/playerSession";

const storageKey = (sceneId: string, playerId: string) =>
  `lighting-vtt:guest-player:v1:${JSON.stringify([sceneId, playerId])}`;
const storageError = "Guest sessions need browser session storage. Enable it and rejoin using the invite link.";

export function createGuestPlayerToken(): string {
  try {
    const probeKey = "lighting-vtt:guest-player:storage-check";
    sessionStorage.setItem(probeKey, "");
    sessionStorage.removeItem(probeKey);
  } catch {
    throw new Error(storageError);
  }
  const bytes = crypto.getRandomValues(new Uint8Array(GUEST_PLAYER_TOKEN_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Keep credentials in this tab across refreshes; never put them in URLs or shared scene state. */
export function saveGuestPlayerToken(sceneId: string, playerId: string, token: string): void {
  if (!isGuestPlayerToken(token)) throw new Error("Invalid guest session");
  try {
    sessionStorage.setItem(storageKey(sceneId, playerId), token);
  } catch {
    throw new Error(storageError);
  }
}

export function readGuestPlayerToken(sceneId: string, playerId: string): string | undefined {
  try {
    const token = sessionStorage.getItem(storageKey(sceneId, playerId));
    return isGuestPlayerToken(token) ? token : undefined;
  } catch {
    return undefined;
  }
}
