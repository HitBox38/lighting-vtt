import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

/** Matches the `LightPreset` type in shared/index.ts. */
export const presetValidator = v.object({
  id: v.string(),
  name: v.string(),
  lights: v.array(lightValidator),
  mirrors: v.array(mirrorValidator),
});

/** Matches the `TokenTemplate` type in shared/index.ts. */
export const tokenTemplateValidator = v.object({
  id: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  imageKey: v.string(),
  borderColor: v.string(),
});

/** A single entry in a combatant's damage log. */
export const damageLogEntryValidator = v.object({
  timestamp: v.number(),
  delta: v.number(), // negative = damage, positive = heal
  source: v.optional(v.string()),
  round: v.optional(v.number()),
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
  currentHp: v.optional(v.number()),
  maxHp: v.optional(v.number()),
  tempHp: v.optional(v.number()),
  ac: v.optional(v.number()),
  damageLog: v.optional(v.array(damageLogEntryValidator)),
  iiCombatantId: v.optional(v.string()),
});

/** Matches the `ScenePlayer` type in shared/index.ts. */
export const scenePlayerValidator = v.object({
  id: v.string(),
  playerName: v.string(),
  characterName: v.string(),
  clerkUserId: v.optional(v.string()),
  tokenInstanceIds: v.array(v.string()),
});

/** Sync configuration for improvedinitiative.app integration. */
export const iiSyncValidator = v.object({
  encounterId: v.string(),
  enabled: v.boolean(),
  pollIntervalMs: v.optional(v.number()), // default 3000
  lastPulledAt: v.optional(v.number()),
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
  presets: v.array(presetValidator),
  tokenTemplates: v.optional(v.array(tokenTemplateValidator)),
  tokens: v.optional(v.array(tokenInstanceValidator)),
  updatedAt: v.number(),
  inviteCode: v.optional(v.string()),
  players: v.optional(v.array(scenePlayerValidator)),
  dmLastSeen: v.optional(v.number()),
  activePlayerIds: v.optional(v.array(v.string())),
  round: v.optional(v.number()),
  turnIndex: v.optional(v.number()),
  iiSync: v.optional(iiSyncValidator),
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export default defineSchema({
  scenes: defineTable({
    creatorId: v.string(),
    name: v.string(),
    mapUrl: v.string(),
    lights: v.array(lightValidator),
    mirrors: v.array(mirrorValidator),
    presets: v.array(presetValidator),
    tokenTemplates: v.optional(v.array(tokenTemplateValidator)),
    tokens: v.optional(v.array(tokenInstanceValidator)),
    updatedAt: v.number(),
    inviteCode: v.optional(v.string()),
    players: v.optional(v.array(scenePlayerValidator)),
    dmLastSeen: v.optional(v.number()),
    activePlayerIds: v.optional(v.array(v.string())),
    round: v.optional(v.number()),
    turnIndex: v.optional(v.number()),
    iiSync: v.optional(iiSyncValidator),
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
});
