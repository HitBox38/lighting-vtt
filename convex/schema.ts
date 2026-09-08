import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { zodToConvex, zodToConvexFields } from "convex-helpers/server/zod4";
import {
  effectDefinitionSchema,
  effectCategorySchema,
  effectInstanceSchema,
  effectKindSchema,
  effectParamSchema,
  effectParamValuesSchema,
} from "../shared/effects";

// ---------------------------------------------------------------------------
// Reusable validators -- exported so convex functions can reference them in
// their `args` and `returns` declarations.
// ---------------------------------------------------------------------------

/** Shared fields present on every light variant. */
const lightBase = {
  id: v.string(),
  x: v.number(),
  y: v.number(),
  radius: v.number(),
  color: v.string(),
  intensity: v.number(),
  locked: v.optional(v.boolean()),
  hidden: v.optional(v.boolean()),
};

/** Discriminated union matching the `Light` type in shared/index.ts. */
export const lightValidator = v.union(
  v.object({
    ...lightBase,
    type: v.literal("radial"),
  }),
  v.object({
    ...lightBase,
    type: v.literal("conic"),
    coneAngle: v.number(),
    targetX: v.number(),
    targetY: v.number(),
  }),
  v.object({
    ...lightBase,
    type: v.literal("line"),
    targetX: v.number(),
    targetY: v.number(),
  }),
);

/** Matches the `Mirror` type in shared/index.ts. */
export const mirrorValidator = v.object({
  id: v.string(),
  x1: v.number(),
  y1: v.number(),
  x2: v.number(),
  y2: v.number(),
  locked: v.optional(v.boolean()),
  fixedWidth: v.optional(v.boolean()),
  hidden: v.optional(v.boolean()),
});

// ---------------------------------------------------------------------------
// Effects -- derived from shared/effects.ts, never hand-mirrored.
// ---------------------------------------------------------------------------

/** Matches `EffectInstance` in shared/effects.ts. */
export const effectInstanceValidator = zodToConvex(effectInstanceSchema);
/** Matches `EffectParam` in shared/effects.ts. */
export const effectParamValidator = zodToConvex(effectParamSchema);
/** Matches `EffectParamValues` in shared/effects.ts. */
export const effectParamValuesValidator = zodToConvex(effectParamValuesSchema);
/** Matches `EffectKind` in shared/effects.ts. */
export const effectKindValidator = zodToConvex(effectKindSchema);
export const thumbnailJobFields = {
  effectId: v.id("effects"), version: v.number(), revision: v.number(), generation: v.number(),
};
/** Matches `EffectDefinition` in shared/effects.ts (the immutable per-version payload). */
export const effectDefinitionValidator = zodToConvex(effectDefinitionSchema);
/** Field map of `EffectDefinition`, spread into the `effectVersions` table. */
export const effectDefinitionFields = zodToConvexFields(
  effectDefinitionSchema.shape,
);

export const effectCatalogFields = {
  category: v.optional(zodToConvex(effectCategorySchema)),
  thumbnailUrl: v.optional(v.string()),
  thumbnailKey: v.optional(v.string()),
  source: v.optional(v.object({ effectId: v.string(), version: v.number() })),
  searchText: v.optional(v.string()),
  starterKey: v.optional(v.string()),
};

export const effectVisibilityValidator = v.union(
  v.literal("private"),
  v.literal("public"),
  /** Set by an admin via `hideEffect`; authors cannot republish a hidden effect. */
  v.literal("hidden"),
);

/** `effects` document including system fields, for query `returns`. */
export const effectDocValidator = v.object({
  ...effectCatalogFields,
  generatedThumbnailUrl: v.optional(v.string()),
  thumbnailStatus: v.optional(v.string()),
  thumbnailVersion: v.optional(v.number()),
  _id: v.id("effects"),
  _creationTime: v.number(),
  authorId: v.string(),
  authorName: v.optional(v.string()),
  name: v.string(),
  description: v.string(),
  kind: effectKindValidator,
  visibility: effectVisibilityValidator,
  latestVersion: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** `effectVersions` document including system fields, for query `returns`. */
export const effectVersionDocValidator = v.object({
  _id: v.id("effectVersions"),
  _creationTime: v.number(),
  effectId: v.id("effects"),
  version: v.number(),
  createdAt: v.number(),
  ...effectDefinitionFields,
});

/** Matches the `LightPreset` type in shared/index.ts. */
export const presetValidator = v.object({
  id: v.string(),
  name: v.string(),
  lights: v.array(lightValidator),
  mirrors: v.array(mirrorValidator),
  effects: v.optional(v.array(effectInstanceValidator)),
});

/** Matches the `TokenTemplate` type in shared/index.ts. */
export const tokenTemplateValidator = v.object({
  id: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  imageKey: v.string(),
  borderColor: v.string(),
});

/** Matches the `TokenInstance` type in shared/index.ts. */
export const tokenInstanceValidator = v.object({
  id: v.string(),
  templateId: v.string(),
  x: v.number(),
  y: v.number(),
  size: v.optional(v.number()),
  hidden: v.optional(v.boolean()),
  initiative: v.optional(v.number()),
});

/** Matches the `ScenePlayer` type in shared/index.ts. */
export const scenePlayerValidator = v.object({
  id: v.string(),
  playerName: v.string(),
  characterName: v.string(),
  clerkUserId: v.optional(v.string()),
  tokenInstanceIds: v.array(v.string()),
});

/**
 * Full scene document validator *including* system fields.
 * Useful as a `returns` validator on queries that return a scene doc.
 */
export const sceneDocValidator = v.object({
  _id: v.id("scenes"),
  _creationTime: v.number(),
  creatorId: v.string(),
  name: v.string(),
  mapUrl: v.string(),
  lights: v.array(lightValidator),
  mirrors: v.array(mirrorValidator),
  effects: v.optional(v.array(effectInstanceValidator)),
  presets: v.array(presetValidator),
  tokenTemplates: v.optional(v.array(tokenTemplateValidator)),
  tokens: v.optional(v.array(tokenInstanceValidator)),
  updatedAt: v.number(),
  inviteCode: v.optional(v.string()),
  players: v.optional(v.array(scenePlayerValidator)),
  dmLastSeen: v.optional(v.number()),
  activePlayerIds: v.optional(v.array(v.string())),
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export default defineSchema({
  // Private capabilities never appear in a scene document or public player roster.
  guestPlayerSessions: defineTable({
    sceneId: v.id("scenes"),
    playerId: v.string(),
    tokenHash: v.string(),
  }).index("by_sceneId_and_playerId", ["sceneId", "playerId"]),
  effectThumbnails: defineTable({
    effectId: v.id("effects"),
    requestedVersion: v.number(),
    rendererRevision: v.number(),
    generation: v.number(),
    status: v.union(v.literal("pending"), v.literal("rendering"), v.literal("ready"), v.literal("failed"), v.literal("canceled")),
    attempts: v.number(),
    nextRunAt: v.number(),
    dispatchScheduled: v.boolean(),
    startedAt: v.optional(v.number()),
    workId: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    renderedVersion: v.optional(v.number()),
    renderedRevision: v.optional(v.number()),
    failureCategory: v.optional(v.string()),
  }).index("by_effectId", ["effectId"]),
  scenes: defineTable({
    creatorId: v.string(),
    name: v.string(),
    mapUrl: v.string(),
    lights: v.array(lightValidator),
    mirrors: v.array(mirrorValidator),
    effects: v.optional(v.array(effectInstanceValidator)),
    presets: v.array(presetValidator),
    tokenTemplates: v.optional(v.array(tokenTemplateValidator)),
    tokens: v.optional(v.array(tokenInstanceValidator)),
    updatedAt: v.number(),
    inviteCode: v.optional(v.string()),
    players: v.optional(v.array(scenePlayerValidator)),
    dmLastSeen: v.optional(v.number()),
    activePlayerIds: v.optional(v.array(v.string())),
  })
    .index("by_creatorId", ["creatorId"])
    .index("by_inviteCode", ["inviteCode"]),

  playerSceneBookmarks: defineTable({
    clerkUserId: v.string(),
    sceneId: v.id("scenes"),
    playerId: v.string(),
    playerName: v.string(),
    characterName: v.string(),
    savedAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_clerkUserId_and_sceneId", ["clerkUserId", "sceneId"]),

  /** Effect metadata. The editable surface is name/description/visibility; code lives in versions. */
  effects: defineTable({
    ...effectCatalogFields,
    authorId: v.string(),
    /** Display name snapshotted from the Clerk identity at create time; the library shows it. */
    authorName: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    kind: effectKindValidator,
    visibility: effectVisibilityValidator,
    latestVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_visibility", ["visibility", "updatedAt"])
    .index("by_visibility_and_category", [
      "visibility",
      "category",
      "updatedAt",
    ])
    .index("by_author_and_category", ["authorId", "category", "updatedAt"])
    .index("by_starterKey", ["starterKey"])
    .searchIndex("search_effects", {
      searchField: "searchText",
      filterFields: ["visibility", "authorId", "category"],
    }),

  /** Immutable snapshots. A scene pins `effectId@version`; rows are never patched. */
  effectVersions: defineTable({
    effectId: v.id("effects"),
    version: v.number(),
    createdAt: v.number(),
    ...effectDefinitionFields,
  }).index("by_effect_version", ["effectId", "version"]),

  /** User reports on public effects, reviewed by admins. */
  effectReports: defineTable({
    effectId: v.id("effects"),
    reporterId: v.string(),
    reason: v.string(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_effect", ["effectId"])
    .index("by_effect_reporter", ["effectId", "reporterId"]),
});
