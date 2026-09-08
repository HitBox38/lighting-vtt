import type { Doc } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { isGuestPlayerToken } from "../../shared/playerSession";
import { getCurrentUserIdOrNull } from "./auth";

export async function hashGuestPlayerToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Public roster IDs identify a player; only account identity or a private capability authenticates one. */
export async function canAuthenticatePlayer(
  ctx: QueryCtx | MutationCtx,
  scene: Doc<"scenes">,
  playerId: string,
  guestToken?: string,
): Promise<boolean> {
  const player = scene.players?.find((candidate) => candidate.id === playerId);
  if (!player) return false;
  if (player.clerkUserId !== undefined) {
    return player.clerkUserId === await getCurrentUserIdOrNull(ctx);
  }
  if (!isGuestPlayerToken(guestToken)) return false;
  const session = await ctx.db.query("guestPlayerSessions")
    .withIndex("by_sceneId_and_playerId", (q) => q.eq("sceneId", scene._id).eq("playerId", playerId))
    .unique();
  return session !== null && session.tokenHash === await hashGuestPlayerToken(guestToken);
}
