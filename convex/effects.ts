import { v } from "convex/values";
import { canReadScene } from "./lib/sceneAuth";
import { paginationOptsValidator } from "convex/server";
import { RateLimiter, HOUR, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  effectDefinitionValidator,
  effectDocValidator,
  effectVersionDocValidator,
} from "./schema";
import {
  getCurrentUserDisplayName,
  getCurrentUserId,
  getCurrentUserIdOrNull,
} from "./lib/auth";
import {
  effectDefinitionSchema,
  effectCategorySchema,
  type EffectDefinition,
} from "../shared/effects";
import { zodToConvex } from "convex-helpers/server/zod4";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import { findThumbnail, requestThumbnail, withThumbnail } from "./lib/thumbnailJobs";

/** Search the entire catalog; never search only a page already loaded by React. */
export const browse = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    mine: v.optional(v.boolean()),
    category: v.optional(zodToConvex(effectCategorySchema)),
  },
  returns: v.object({
    page: v.array(effectDocValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const result = await (async () => {
    const userId = args.mine ? await getCurrentUserIdOrNull(ctx) : null;
    if (args.mine && !userId)
      return { page: [], isDone: true, continueCursor: "" };
    const search = args.search
      ?.trim()
      .slice(0, 200)
      .split(/\s+/)
      .slice(0, 16)
      .join(" ");
    if (search)
      return await ctx.db
        .query("effects")
        .withSearchIndex("search_effects", (q) => {
          const scoped = userId
            ? q.search("searchText", search).eq("authorId", userId)
            : q.search("searchText", search).eq("visibility", "public");
          return args.category ? scoped.eq("category", args.category) : scoped;
        })
        .paginate(args.paginationOpts);
    if (userId)
      return args.category
        ? await ctx.db
            .query("effects")
            .withIndex("by_author_and_category", (q) =>
              q.eq("authorId", userId).eq("category", args.category),
            )
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("effects")
            .withIndex("by_author", (q) => q.eq("authorId", userId))
            .order("desc")
            .paginate(args.paginationOpts);
    return args.category
      ? await ctx.db
          .query("effects")
          .withIndex("by_visibility_and_category", (q) =>
            q.eq("visibility", "public").eq("category", args.category),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("effects")
          .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
          .order("desc")
          .paginate(args.paginationOpts);
    })();
    return { ...result, page: await Promise.all(result.page.map((effect) => withThumbnail(ctx, effect))) };
  },
});

/** Deploy-time, bounded and restartable. Existing versions are never rewritten. */
export const prepareWorkshop = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({ done: v.boolean(), cursor: v.string() }),
  handler: async (ctx, args) => {
    for (const [i, definition] of EFFECT_STARTERS.entries()) {
      const starterKey = `workshop-v1-${i}`;
      const existing = await ctx.db
        .query("effects")
        .withIndex("by_starterKey", (q) => q.eq("starterKey", starterKey))
        .unique();
      if (!existing) {
        const now = Date.now();
        const effectId = await ctx.db.insert("effects", {
          authorId: "system:lighting-vtt",
          authorName: "Lighting VTT",
          name: definition.name,
          description: definition.description,
          kind: definition.kind,
          category: definition.category,
          visibility: "public",
          latestVersion: 1,
          createdAt: now,
          updatedAt: now,
          starterKey,
          searchText: searchable(
            definition.name,
            definition.description,
            "Lighting VTT",
          ),
        });
        await insertVersion(ctx, effectId, 1, definition, now);
      }
    }
    const page = await ctx.db
      .query("effects")
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    for (const effect of page.page)
      await ctx.db.patch(effect._id, {
        searchText: searchable(
          effect.name,
          effect.description,
          effect.authorName,
        ),
        category: effect.category ?? "Other",
      });
    return { done: page.isDone, cursor: page.continueCursor };
  },
});

// ---------------------------------------------------------------------------
// Rate limits (Stage 2 moderation). Keys are per user.
// ---------------------------------------------------------------------------

const rateLimiter = new RateLimiter(components.rateLimiter, {
  createEffect: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  saveEffectVersion: {
    kind: "token bucket",
    rate: 120,
    period: HOUR,
    capacity: 20,
  },
  publishEffect: { kind: "token bucket", rate: 10, period: HOUR, capacity: 5 },
  reportEffect: { kind: "token bucket", rate: 20, period: HOUR, capacity: 5 },
  hideEffect: { kind: "fixed window", rate: 60, period: MINUTE },
});

const MAX_REPORT_REASON_LENGTH = 500;
const searchable = (name: string, description: string, author?: string) =>
  `${name} ${description} ${author ?? ""}`;
const catalogMetadata = (definition: EffectDefinition) => ({
  category: definition.category ?? "Other",
  thumbnailUrl: definition.thumbnailUrl,
  thumbnailKey: definition.thumbnailKey,
  source: definition.source,
});

// ---------------------------------------------------------------------------
// Shared helpers (plain functions; the query/mutation wrappers stay thin)
// ---------------------------------------------------------------------------

type Ctx = QueryCtx | MutationCtx;

/**
 * Whether `userId` may read `effect` (metadata and versions).
 * Public effects are readable by everyone, including signed-out players.
 * Hidden effects are readable only by their author, so pinned scenes degrade.
 */
function canReadEffect(effect: Doc<"effects">, userId: string | null): boolean {
  switch (effect.visibility) {
    case "public":
      return true;
    case "private":
    case "hidden":
      return userId !== null && effect.authorId === userId;
    default: {
      const exhaustive: never = effect.visibility;
      throw new Error(`Unhandled visibility: ${String(exhaustive)}`);
    }
  }
}

async function getOwnedEffect(
  ctx: Ctx,
  effectId: Id<"effects">,
  userId: string,
): Promise<Doc<"effects">> {
  const effect = await ctx.db.get(effectId);
  if (!effect) {
    throw new Error("Effect not found");
  }
  if (effect.authorId !== userId) {
    throw new Error("Unauthorized: only the author can modify this effect");
  }
  return effect;
}

/** Runs the Zod refinements the Convex validator cannot express (limits, duplicates, required source). */
function parseDefinition(input: EffectDefinition): EffectDefinition {
  const result = effectDefinitionSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") ?? "";
    throw new Error(
      `Invalid effect definition${path ? ` at ${path}` : ""}: ${first?.message ?? "unknown"}`,
    );
  }
  return result.data;
}

function isAdmin(userId: string): boolean {
  const raw = process.env.EFFECT_ADMIN_USER_IDS ?? "";
  const allowlist = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return allowlist.includes(userId);
}

async function insertVersion(
  ctx: MutationCtx,
  effectId: Id<"effects">,
  version: number,
  definition: EffectDefinition,
  now: number,
): Promise<void> {
  await ctx.db.insert("effectVersions", {
    effectId,
    version,
    createdAt: now,
    ...definition,
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Effects authored by the signed-in user, newest first. Empty when signed out. */
export const listMine = query({
  args: {},
  returns: v.array(effectDocValidator),
  handler: async (ctx) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    if (userId === null) return [];
    const effects = await ctx.db
      .query("effects")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .order("desc")
      .collect();
    return await Promise.all(effects.map((effect) => withThumbnail(ctx, effect)));
  },
});

/** Public effects, newest update first. Hidden effects never appear here. */
export const listPublic = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(effectDocValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("effects")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((effect) => withThumbnail(ctx, effect))) };
  },
});

/** Effect metadata, or null when missing or not readable by the caller. */
export const getEffect = query({
  args: { effectId: v.string() },
  returns: v.union(effectDocValidator, v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("effects", args.effectId);
    if (!id) return null;
    const effect = await ctx.db.get(id);
    if (!effect) return null;
    const userId = await getCurrentUserIdOrNull(ctx);
    return canReadEffect(effect, userId) ? await withThumbnail(ctx, effect) : null;
  },
});

/**
 * One immutable version. `effectId` is a string because scenes store it that
 * way; unknown ids resolve to null so a stale scene degrades instead of throwing.
 */
export const getVersion = query({
  args: { effectId: v.string(), version: v.number() },
  returns: v.union(effectVersionDocValidator, v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("effects", args.effectId);
    if (!id) return null;
    const effect = await ctx.db.get(id);
    if (!effect) return null;
    const userId = await getCurrentUserIdOrNull(ctx);
    if (!canReadEffect(effect, userId)) return null;
    return await ctx.db
      .query("effectVersions")
      .withIndex("by_effect_version", (q) =>
        q.eq("effectId", id).eq("version", args.version),
      )
      .unique();
  },
});

/**
 * Batched `getVersion` for a whole scene: one subscription instead of one per
 * instance. Unreadable or missing refs are simply absent from the result, so
 * the renderer degrades those instances instead of failing the whole scene.
 */
export const getVersions = query({
  args: {
    refs: v.array(v.object({ effectId: v.string(), version: v.number() })),
    /**
     * An author's scene shares its actively pinned private versions with the
     * table. Other scene owners cannot grant access to that author's source.
     */
    sceneId: v.optional(v.id("scenes")),
    playerId: v.optional(v.string()),
    guestToken: v.optional(v.string()),
  },
  returns: v.array(effectVersionDocValidator),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    const scene = args.sceneId ? await ctx.db.get(args.sceneId) : null;
    const readableScene = scene && await canReadScene(ctx, scene, args) ? scene : null;
    const pinnedByScene = new Set(
      (readableScene?.effects ?? []).map(
        (instance) => `${instance.effectId}@${instance.version}`,
      ),
    );

    const effectCache = new Map<string, Doc<"effects"> | null>();
    const seen = new Set<string>();
    const out: Doc<"effectVersions">[] = [];

    for (const ref of args.refs) {
      const key = `${ref.effectId}@${ref.version}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const id = ctx.db.normalizeId("effects", ref.effectId);
      if (!id) continue;

      let effect = effectCache.get(id);
      if (effect === undefined) {
        effect = await ctx.db.get(id);
        effectCache.set(id, effect);
      }
      if (!effect) continue;
      // Stored pins alone are not grants: old scenes may contain forged refs,
      // or refs to effects that were public before being made private. Only the
      // author can share private source through their own table. Hidden effects
      // remain author-only, including on the author's table.
      const readable =
        canReadEffect(effect, userId) ||
        (effect.visibility !== "hidden" &&
          scene?.creatorId === effect.authorId &&
          pinnedByScene.has(key));
      if (!readable) continue;

      const row = await ctx.db
        .query("effectVersions")
        .withIndex("by_effect_version", (q) =>
          q.eq("effectId", id).eq("version", ref.version),
        )
        .unique();
      if (row) out.push(row);
    }
    return out;
  },
});

/** Version list for the picker (no source payload). */
export const listVersions = query({
  args: { effectId: v.string() },
  returns: v.array(
    v.object({ version: v.number(), createdAt: v.number(), name: v.string() }),
  ),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("effects", args.effectId);
    if (!id) return [];
    const effect = await ctx.db.get(id);
    if (!effect) return [];
    const userId = await getCurrentUserIdOrNull(ctx);
    if (!canReadEffect(effect, userId)) return [];
    const versions = await ctx.db
      .query("effectVersions")
      .withIndex("by_effect_version", (q) => q.eq("effectId", id))
      .order("desc")
      .collect();
    return versions.map((row) => ({
      version: row.version,
      createdAt: row.createdAt,
      name: row.name,
    }));
  },
});

// ---------------------------------------------------------------------------
// Mutations (author)
// ---------------------------------------------------------------------------

/** Create a private effect with version 1. */
export const createEffect = mutation({
  args: { definition: effectDefinitionValidator },
  returns: v.object({ effectId: v.id("effects"), version: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    await rateLimiter.limit(ctx, "createEffect", { key: userId, throws: true });
    const definition = parseDefinition(args.definition);
    if (definition.kind === "shader" && definition.source) {
      delete definition.thumbnailUrl;
      delete definition.thumbnailKey;
    }
    if (definition.source) {
      const sourceId = ctx.db.normalizeId(
        "effects",
        definition.source.effectId,
      );
      const original = sourceId ? await ctx.db.get(sourceId) : null;
      if (!original || !canReadEffect(original, userId))
        throw new Error("Remix source is unavailable");
      const version = await ctx.db
        .query("effectVersions")
        .withIndex("by_effect_version", (q) =>
          q
            .eq("effectId", original._id)
            .eq("version", definition.source!.version),
        )
        .unique();
      if (!version) throw new Error("Remix source version is unavailable");
    }
    const authorName = await getCurrentUserDisplayName(ctx);
    const now = Date.now();

    const effectId = await ctx.db.insert("effects", {
      authorId: userId,
      ...(authorName !== null ? { authorName } : {}),
      ...catalogMetadata(definition),
      searchText: searchable(
        definition.name,
        definition.description,
        authorName ?? undefined,
      ),
      name: definition.name,
      description: definition.description,
      kind: definition.kind,
      visibility: "private",
      latestVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
    await insertVersion(ctx, effectId, 1, definition, now);

    if (definition.kind === "shader") await requestThumbnail(ctx, effectId, 1);

    return { effectId, version: 1 };
  },
});

/** Append a new immutable version and bump `latestVersion`. Existing pins are untouched. */
export const saveVersion = mutation({
  args: { effectId: v.id("effects"), definition: effectDefinitionValidator },
  returns: v.object({ version: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    await rateLimiter.limit(ctx, "saveEffectVersion", {
      key: userId,
      throws: true,
    });
    const effect = await getOwnedEffect(ctx, args.effectId, userId);
    const definition = parseDefinition(args.definition);
    definition.source = effect.source;
    if (definition.kind === "shader") {
      definition.thumbnailUrl ??= effect.thumbnailUrl;
      definition.thumbnailKey ??= effect.thumbnailKey;
    }
    if (definition.kind !== effect.kind) {
      throw new Error(
        "An effect cannot change kind between versions; create a new effect instead",
      );
    }

    const now = Date.now();
    const version = effect.latestVersion + 1;
    await insertVersion(ctx, args.effectId, version, definition, now);
    await ctx.db.patch(args.effectId, {
      ...catalogMetadata(definition),
      searchText: searchable(
        definition.name,
        definition.description,
        effect.authorName,
      ),
      name: definition.name,
      description: definition.description,
      latestVersion: version,
      updatedAt: now,
    });

    if (definition.kind === "shader") await requestThumbnail(ctx, args.effectId, version);

    return { version };
  },
});

/**
 * Delete an effect and all its versions. Public effects must be unpublished
 * first so the author sees the "scenes will break" warning; hidden effects can
 * be deleted directly since `hideEffect` already closed their reports and the
 * author has no other way to get rid of them.
 */
export const deleteEffect = mutation({
  args: { effectId: v.id("effects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const effect = await getOwnedEffect(ctx, args.effectId, userId);
    if (effect.visibility === "public") {
      throw new Error("Unpublish the effect before deleting it");
    }

    const versions = await ctx.db
      .query("effectVersions")
      .withIndex("by_effect_version", (q) => q.eq("effectId", args.effectId))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }
    const thumbnail = await findThumbnail(ctx, args.effectId);
    if (thumbnail) {
      if (thumbnail.storageId) await ctx.storage.delete(thumbnail.storageId);
      await ctx.db.delete(thumbnail._id);
    }
    await ctx.db.delete(args.effectId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Mutations (library / moderation)
// ---------------------------------------------------------------------------

/** Make an effect visible in the public library. Hidden effects cannot be republished. */
export const publishEffect = mutation({
  args: { effectId: v.id("effects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    await rateLimiter.limit(ctx, "publishEffect", {
      key: userId,
      throws: true,
    });
    const effect = await getOwnedEffect(ctx, args.effectId, userId);
    switch (effect.visibility) {
      case "public":
        return null;
      case "hidden":
        throw new Error(
          "This effect was hidden by a moderator and cannot be republished",
        );
      case "private":
        await ctx.db.patch(args.effectId, {
          visibility: "public",
          updatedAt: Date.now(),
        });
        return null;
      default: {
        const exhaustive: never = effect.visibility;
        throw new Error(`Unhandled visibility: ${String(exhaustive)}`);
      }
    }
  },
});

/**
 * Remove an effect from the library. The author's own tables keep sharing their
 * pinned versions. Other tables lose source access: legacy pins cannot prove a
 * persistent grant from before privatization.
 */
export const unpublishEffect = mutation({
  args: { effectId: v.id("effects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const effect = await getOwnedEffect(ctx, args.effectId, userId);
    if (effect.visibility !== "public") {
      return null;
    }
    await ctx.db.patch(args.effectId, {
      visibility: "private",
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** File a report on a public effect. One open report per reporter per effect. */
export const reportEffect = mutation({
  args: { effectId: v.id("effects"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    await rateLimiter.limit(ctx, "reportEffect", { key: userId, throws: true });

    const reason = args.reason.trim();
    if (reason.length === 0) {
      throw new Error("A reason is required");
    }
    if (reason.length > MAX_REPORT_REASON_LENGTH) {
      throw new Error(
        `Reason must be at most ${MAX_REPORT_REASON_LENGTH} characters`,
      );
    }

    const effect = await ctx.db.get(args.effectId);
    if (!effect || effect.visibility !== "public") {
      throw new Error("Only public effects can be reported");
    }

    const existing = await ctx.db
      .query("effectReports")
      .withIndex("by_effect_reporter", (q) =>
        q.eq("effectId", args.effectId).eq("reporterId", userId),
      )
      .collect();
    if (existing.some((report) => report.resolvedAt === undefined)) {
      throw new Error("You already have an open report on this effect");
    }

    await ctx.db.insert("effectReports", {
      effectId: args.effectId,
      reporterId: userId,
      reason,
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * Admin-only: pull an effect from the library and block republishing.
 * Admins are the Clerk user ids listed in the `EFFECT_ADMIN_USER_IDS` env var.
 */
export const hideEffect = mutation({
  args: { effectId: v.id("effects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!isAdmin(userId)) {
      throw new Error("Unauthorized: admin access required");
    }
    await rateLimiter.limit(ctx, "hideEffect", { key: userId, throws: true });

    const effect = await ctx.db.get(args.effectId);
    if (!effect) {
      throw new Error("Effect not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.effectId, { visibility: "hidden", updatedAt: now });

    const reports = await ctx.db
      .query("effectReports")
      .withIndex("by_effect", (q) => q.eq("effectId", args.effectId))
      .collect();
    for (const report of reports) {
      if (report.resolvedAt === undefined) {
        await ctx.db.patch(report._id, { resolvedAt: now });
      }
    }
    return null;
  },
});

/** Admin-only: close a report without touching the effect (false positive, duplicate, already handled). */
export const dismissReport = mutation({
  args: { reportId: v.id("effectReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!isAdmin(userId)) {
      throw new Error("Unauthorized: admin access required");
    }
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    if (report.resolvedAt === undefined) {
      await ctx.db.patch(args.reportId, { resolvedAt: Date.now() });
    }
    return null;
  },
});

/** Whether the caller is on the moderation allowlist; the library uses it to show the reports queue. */
export const amAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    return userId !== null && isAdmin(userId);
  },
});

/** Admin-only: open reports, newest first, for a moderation view. */
export const listOpenReports = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("effectReports"),
      effectId: v.id("effects"),
      effectName: v.union(v.string(), v.null()),
      reporterId: v.string(),
      reason: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    if (userId === null || !isAdmin(userId)) return [];

    const reports = await ctx.db.query("effectReports").order("desc").take(200);
    const open = reports.filter((report) => report.resolvedAt === undefined);
    const result = [];
    for (const report of open) {
      const effect = await ctx.db.get(report.effectId);
      result.push({
        _id: report._id,
        effectId: report.effectId,
        effectName: effect?.name ?? null,
        reporterId: report.reporterId,
        reason: report.reason,
        createdAt: report.createdAt,
      });
    }
    return result;
  },
});
