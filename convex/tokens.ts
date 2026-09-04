import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Apply damage (negative delta) or healing (positive delta) to a token.
 *
 * Damage is deducted from `tempHp` first, then `currentHp`.
 * `currentHp` is allowed to go negative (death-save territory).
 * A damage-log entry is appended with the current round.
 */
export const applyDamage = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    tokenId: v.string(),
    delta: v.number(),
    source: v.optional(v.string()),
  },
  returns: v.object({
    currentHp: v.number(),
    tempHp: v.number(),
  }),
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can apply damage");
    }

    const tokens = scene.tokens ?? [];
    const tokenIndex = tokens.findIndex((t) => t.id === args.tokenId);
    if (tokenIndex === -1) throw new Error("Token not found");

    const token = tokens[tokenIndex];
    let currentHp = token.currentHp ?? 0;
    let tempHp = token.tempHp ?? 0;
    const round = scene.round ?? undefined;

    if (args.delta < 0) {
      // Damage: deduct from tempHp first, then currentHp
      let remaining = Math.abs(args.delta);
      if (tempHp > 0) {
        const absorbedByTemp = Math.min(tempHp, remaining);
        tempHp -= absorbedByTemp;
        remaining -= absorbedByTemp;
      }
      currentHp -= remaining;
    } else {
      // Healing: add to currentHp, capped at maxHp if set
      currentHp += args.delta;
      if (token.maxHp !== undefined && currentHp > token.maxHp) {
        currentHp = token.maxHp;
      }
    }

    const logEntry = {
      timestamp: Date.now(),
      delta: args.delta,
      source: args.source,
      round,
    };

    const existingLog = token.damageLog ?? [];
    const updatedToken = {
      ...token,
      currentHp,
      tempHp,
      damageLog: [...existingLog, logEntry],
    };

    const nextTokens = [...tokens];
    nextTokens[tokenIndex] = updatedToken;

    await ctx.db.patch(args.sceneId, {
      tokens: nextTokens,
      updatedAt: Date.now(),
    });

    return { currentHp, tempHp };
  },
});

/**
 * Set temporary HP on a token. Replaces any existing tempHp value.
 */
export const setTempHp = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    tokenId: v.string(),
    tempHp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can set temp HP");
    }

    const tokens = scene.tokens ?? [];
    const tokenIndex = tokens.findIndex((t) => t.id === args.tokenId);
    if (tokenIndex === -1) throw new Error("Token not found");

    const nextTokens = [...tokens];
    nextTokens[tokenIndex] = {
      ...nextTokens[tokenIndex],
      tempHp: Math.max(0, args.tempHp),
    };

    await ctx.db.patch(args.sceneId, {
      tokens: nextTokens,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Set HP and AC values on a token (used for initial setup / editing stats).
 */
export const setTokenStats = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    tokenId: v.string(),
    currentHp: v.optional(v.number()),
    maxHp: v.optional(v.number()),
    ac: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can set token stats");
    }

    const tokens = scene.tokens ?? [];
    const tokenIndex = tokens.findIndex((t) => t.id === args.tokenId);
    if (tokenIndex === -1) throw new Error("Token not found");

    const patch: Record<string, unknown> = { ...tokens[tokenIndex] };
    if (args.currentHp !== undefined) patch.currentHp = args.currentHp;
    if (args.maxHp !== undefined) patch.maxHp = args.maxHp;
    if (args.ac !== undefined) patch.ac = args.ac;

    const nextTokens = [...tokens];
    nextTokens[tokenIndex] = patch as (typeof tokens)[number];

    await ctx.db.patch(args.sceneId, {
      tokens: nextTokens,
      updatedAt: Date.now(),
    });

    return null;
  },
});
