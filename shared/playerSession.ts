/** Guest capabilities are 32 cryptographically random bytes, encoded as lowercase hex. */
export const GUEST_PLAYER_TOKEN_BYTES = 32;

export function isGuestPlayerToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
