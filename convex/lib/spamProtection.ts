import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

// Separate burst allowances from sustained rates so table setup stays quick.
// Keys must come from verified identities or an authorized scene, never guest tokens.
export const spamLimiter = new RateLimiter(components.rateLimiter, {
  createScene: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  joinScene: { kind: "token bucket", rate: 30, period: HOUR, capacity: 20 },
  uploadFile: { kind: "token bucket", rate: 120, period: HOUR, capacity: 30 },
  deleteFile: { kind: "token bucket", rate: 120, period: HOUR, capacity: 30 },
});

export async function limitSceneWrite(
  ctx: MutationCtx,
  name: "createScene" | "joinScene",
  key: string,
) {
  const result = await spamLimiter.limit(ctx, name, { key });
  if (!result.ok) {
    const seconds = Math.max(1, Math.ceil(result.retryAfter / 1000));
    throw new ConvexError(`Too many ${name === "createScene" ? "new scenes" : "new players joining this scene"}. Try again in ${seconds} seconds.`);
  }
}

export const MAX_SCENE_PLAYERS = 50;
export const MAX_PLAYER_NAME_LENGTH = 100;
