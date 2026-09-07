import type { GenericActionCtx, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type AuthCtx =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>
  | GenericActionCtx<DataModel>;

/**
 * Returns the Clerk user id (`identity.subject`) of the caller, or `null` when
 * the request is unauthenticated.
 *
 * Clerk's `subject` claim is the same value the frontend sees as `user.id`,
 * which is what the app already stores in `scenes.creatorId`, so the two can
 * be compared directly.
 */
export async function getCurrentUserIdOrNull(ctx: AuthCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/**
 * Returns the Clerk user id of the caller or throws when unauthenticated.
 */
export async function getCurrentUserId(ctx: AuthCtx): Promise<string> {
  const userId = await getCurrentUserIdOrNull(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }
  return userId;
}

const MAX_DISPLAY_NAME_LENGTH = 80;

/**
 * Best-effort public display name for the caller, or `null` when the identity
 * carries none. Never falls back to the email: this value is shown to strangers.
 */
export async function getCurrentUserDisplayName(ctx: AuthCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const candidates = [identity.nickname, identity.name, identity.preferredUsername, identity.givenName];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
    }
  }
  return null;
}

/**
 * Legacy scene/player mutations still accept a client-sent `creatorId`.
 * This closes the spoofing hole without changing their signatures: the caller
 * must be signed in and the id they claim must be their own.
 */
export async function assertCreatorMatchesIdentity(
  ctx: AuthCtx,
  claimedCreatorId: string,
): Promise<void> {
  const userId = await getCurrentUserId(ctx);
  if (userId !== claimedCreatorId) {
    throw new Error("Unauthorized: creatorId does not match the signed-in user");
  }
}
