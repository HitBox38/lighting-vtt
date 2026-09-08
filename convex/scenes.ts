import { canReadScene } from "./lib/sceneAuth";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  effectInstanceValidator,
  lightValidator,
  mirrorValidator,
  presetValidator,
  sceneDocValidator,
  tokenTemplateValidator,
  tokenInstanceValidator,
} from "./schema";
import { assertCreatorMatchesIdentity } from "./lib/auth";
import { assertSceneEffectInstances } from "./lib/effectInstances";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch every scene belonging to a given creator. */
export const getByCreatorId = query({
  args: { creatorId: v.string() },
  returns: v.array(sceneDocValidator),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    return await ctx.db
      .query("scenes")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", args.creatorId))
      .collect();
  },
});

/** Fetch a scene for its creator or a current authenticated player. */
export const getById = query({
  args: { id: v.id("scenes"), playerId: v.optional(v.string()), guestToken: v.optional(v.string()) },
  returns: v.union(sceneDocValidator, v.null()),
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.id);
    return scene && await canReadScene(ctx, scene, args) ? scene : null;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a brand-new scene with empty lights / mirrors / presets. */
export const create = mutation({
  args: {
    creatorId: v.string(),
    name: v.string(),
    mapUrl: v.string(),
  },
  returns: v.id("scenes"),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    return await ctx.db.insert("scenes", {
      creatorId: args.creatorId,
      name: args.name,
      mapUrl: args.mapUrl,
      lights: [],
      mirrors: [],
      effects: [],
      presets: [],
      tokenTemplates: [],
      tokens: [],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Patch the lights and mirrors arrays on an existing scene.
 * Only the scene's creator is allowed to perform this operation.
 */
export const update = mutation({
  args: {
    id: v.id("scenes"),
    creatorId: v.string(),
    lights: v.array(lightValidator),
    mirrors: v.array(mirrorValidator),
    effects: v.optional(v.array(effectInstanceValidator)),
    tokenTemplates: v.array(tokenTemplateValidator),
    tokens: v.array(tokenInstanceValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.id);
    if (!scene) {
      throw new Error("Scene not found");
    }
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can update this scene");
    }

    const effects = await assertSceneEffectInstances(ctx, scene, args.effects ?? [], "a scene");

    await ctx.db.patch(args.id, {
      lights: args.lights,
      mirrors: args.mirrors,
      effects,
      tokenTemplates: args.tokenTemplates,
      tokens: args.tokens,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Create or update a preset within a scene's presets array.
 * If a preset with the same `id` already exists it is replaced; otherwise the
 * new preset is appended.
 */
export const savePreset = mutation({
  args: {
    id: v.id("scenes"),
    creatorId: v.string(),
    preset: presetValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.id);
    if (!scene) {
      throw new Error("Scene not found");
    }
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can modify presets");
    }

    const preset = {
      ...args.preset,
      effects: await assertSceneEffectInstances(ctx, scene, args.preset.effects ?? [], "a preset"),
    };
    const existingIndex = scene.presets.findIndex((p) => p.id === preset.id);
    const updatedPresets = [...scene.presets];

    if (existingIndex >= 0) {
      updatedPresets[existingIndex] = preset;
    } else {
      updatedPresets.push(preset);
    }

    await ctx.db.patch(args.id, {
      presets: updatedPresets,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/** Remove a preset by its client-generated id from a scene's presets array. */
export const deletePreset = mutation({
  args: {
    id: v.id("scenes"),
    creatorId: v.string(),
    presetId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.id);
    if (!scene) {
      throw new Error("Scene not found");
    }
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can modify presets");
    }

    const updatedPresets = scene.presets.filter((p) => p.id !== args.presetId);
    if (updatedPresets.length === scene.presets.length) {
      throw new Error("Preset not found");
    }

    await ctx.db.patch(args.id, {
      presets: updatedPresets,
      updatedAt: Date.now(),
    });

    return null;
  },
});
