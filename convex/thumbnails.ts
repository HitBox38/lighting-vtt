import { v } from "convex/values";
import { Workpool, vOnCompleteArgs } from "@convex-dev/workpool";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { effectVersionDocValidator, thumbnailJobFields as jobFields } from "./schema";
import { findThumbnail, requestThumbnail, scheduleThumbnail, thumbnailsEnabled } from "./lib/thumbnailJobs";

const pool = new Workpool(components.thumbnailWorkpool, { maxParallelism: 2 });
const jobValidator = v.object(jobFields);

export const dispatch = internalMutation({
  args: { effectId: v.id("effects"), target: jobFields.target }, returns: v.null(),
  handler: async (ctx, { effectId, target }) => {
    const row = await findThumbnail(ctx, effectId, target);
    if (!row || row.workId) return null;
    await ctx.db.patch(row._id, { dispatchScheduled: false });
    if (!thumbnailsEnabled()) {
      await ctx.db.patch(row._id, { status: "canceled" });
      return null;
    }
    if (row.status === "ready" || row.status === "failed") return null;
    if (Date.now() < row.nextRunAt) {
      await scheduleThumbnail(ctx, { ...row, dispatchScheduled: false });
      return null;
    }
    const generation = row.generation + 1;
    const job = { effectId, version: row.requestedVersion, revision: row.rendererRevision, generation, ...(target ? { target } : {}) };
    const workId = await pool.enqueueAction(ctx, internal.thumbnailActions.render, job, {
      retry: false, onComplete: internal.thumbnails.completed, context: job,
    });
    await ctx.db.patch(row._id, { workId, generation, status: "pending" });
    return null;
  },
});

export const begin = internalMutation({
  args: jobFields, returns: v.union(v.object({ definition: effectVersionDocValidator, attempt: v.number() }), v.literal("busy"), v.null()),
  handler: async (ctx, job) => {
    const row = await findThumbnail(ctx, job.effectId, job.target);
    if (!row?.workId || row.generation !== job.generation || row.requestedVersion !== job.version ||
        row.rendererRevision !== job.revision || !thumbnailsEnabled()) return null;
    if (row.status === "rendering") return "busy" as const;
    const effect = await ctx.db.get(job.effectId);
    if (!effect || effect.kind !== "shader" || (job.target === "published"
      ? effect.visibility !== "public" || effect.publishedVersion !== job.version
      : effect.latestVersion !== job.version)) return null;
    const version = await ctx.db.query("effectVersions").withIndex("by_effect_version", (q) =>
      q.eq("effectId", job.effectId).eq("version", job.version)).unique();
    if (!version) return null;
    await ctx.db.patch(row._id, { status: "rendering", startedAt: Date.now(), attempts: row.attempts + 1 });
    return { definition: version, attempt: row.attempts + 1 };
  },
});

export const finish = internalMutation({
  args: { ...jobFields, storageId: v.id("_storage") }, returns: v.boolean(),
  handler: async (ctx, job) => {
    const row = await findThumbnail(ctx, job.effectId, job.target);
    if (row?.storageId === job.storageId) return true;
    const effect = await ctx.db.get(job.effectId);
    const version = await ctx.db.query("effectVersions").withIndex("by_effect_version", q => q.eq("effectId", job.effectId).eq("version", job.version)).unique();
    // A delayed duplicate may outlive the row's next request. Keep accepted images.
    if (version?.generatedThumbnailStorageId === job.storageId) return true;
    if (!row?.workId || row.generation !== job.generation || row.requestedVersion !== job.version ||
        row.rendererRevision !== job.revision || !thumbnailsEnabled() || !effect || (job.target === "published"
          ? effect.visibility !== "public" || effect.publishedVersion !== job.version
          : effect.latestVersion !== job.version)) {
      if (await ctx.db.system.get(job.storageId)) await ctx.storage.delete(job.storageId);
      return false;
    }
    if (!version) { await ctx.storage.delete(job.storageId); return false; }
    // Keep images with their immutable source versions so releasing an older
    // version never borrows an image from a newer private draft.
    const oldVersionImage = version.generatedThumbnailStorageId;
    await ctx.db.patch(version._id, { generatedThumbnailStorageId: job.storageId });
    if (oldVersionImage && oldVersionImage !== effect?.releasedCatalog?.thumbnailStorageId && oldVersionImage !== job.storageId)
      await ctx.storage.delete(oldVersionImage);
    await ctx.db.patch(row._id, {
      storageId: job.storageId, renderedVersion: job.version, renderedRevision: job.revision,
      status: "ready", workId: undefined, failureCategory: undefined,
    });
    if (effect?.publishedVersion === job.version && effect.releasedCatalog) {
      const previous = effect.releasedCatalog.thumbnailStorageId;
      await ctx.db.patch(effect._id, { releasedCatalog: { ...effect.releasedCatalog, thumbnailStorageId: job.storageId } });
      if (previous && previous === oldVersionImage && previous !== job.storageId) await ctx.storage.delete(previous);
    }
    return true;
  },
});

export const discard = internalMutation({
  args: { effectId: v.id("effects"), storageId: v.id("_storage"), version: v.optional(v.number()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const version = args.version === undefined ? null : await ctx.db.query("effectVersions").withIndex("by_effect_version", q => q.eq("effectId", args.effectId).eq("version", args.version!)).unique();
    if (version?.generatedThumbnailStorageId !== args.storageId && (await ctx.db.get(args.effectId))?.releasedCatalog?.thumbnailStorageId !== args.storageId && (await findThumbnail(ctx, args.effectId))?.storageId !== args.storageId && (await findThumbnail(ctx, args.effectId, "published"))?.storageId !== args.storageId && await ctx.db.system.get(args.storageId)) await ctx.storage.delete(args.storageId);
    return null;
  },
});

export const completed = internalMutation({
  args: vOnCompleteArgs(jobValidator), returns: v.null(),
  handler: async (ctx, { workId, context: job, result }) => {
    const row = await findThumbnail(ctx, job.effectId, job.target);
    if (row?.workId !== workId || row.generation !== job.generation) return null;
    const newer = row.requestedVersion !== job.version || row.rendererRevision !== job.revision;
    const outcome = result.kind === "success" ? result.returnValue as { retryable?: boolean; category?: string } | null : null;
    if (outcome?.category === "duplicate") return null;
    const retry = !newer && outcome?.retryable === true && row.attempts < 3;
    const enabled = thumbnailsEnabled();
    const status = !enabled ? "canceled" : newer || retry ? "pending" : result.kind === "canceled" ? "canceled" : "failed";
    const next = {
      ...row, workId: undefined, status,
      nextRunAt: Math.max(Date.now() + (retry ? 60_000 * 2 ** Math.max(0, row.attempts - 1) : 0), (row.startedAt ?? 0) + 60_000, row.nextRunAt),
      failureCategory: newer ? undefined : outcome?.category ?? result.kind,
    } as const;
    await ctx.db.patch(row._id, { workId: undefined, status, nextRunAt: next.nextRunAt, failureCategory: next.failureCategory });
    if (status === "pending") await scheduleThumbnail(ctx, next);
    return null;
  },
});

/** Bounded backfill of latest drafts and exact current releases, with independent jobs. */
export const backfill = internalMutation({
  args: { cursor: v.optional(v.string()), retryFailed: v.optional(v.boolean()) },
  returns: v.object({ done: v.boolean(), cursor: v.string(), requested: v.number() }),
  handler: async (ctx, args) => {
    if (!thumbnailsEnabled()) throw new Error("Enable EFFECT_THUMBNAILS_ENABLED before backfill");
    const page = await ctx.db.query("effects").paginate({ cursor: args.cursor ?? null, numItems: 25 });
    let requested = 0;
    for (const effect of page.page) {
      if (effect.kind === "shader") {
        await requestThumbnail(ctx, effect._id, effect.latestVersion, { retryFailed: args.retryFailed });
        requested++;
        if (effect.visibility === "public" && effect.publishedVersion !== undefined && effect.publishedVersion !== effect.latestVersion) {
          const version = await ctx.db.query("effectVersions").withIndex("by_effect_version", q => q.eq("effectId", effect._id).eq("version", effect.publishedVersion!)).unique();
          if (version) {
            const existingImage = version.generatedThumbnailStorageId ?? effect.releasedCatalog?.thumbnailStorageId;
            if (existingImage) {
              // Reattach an exact-version image if only its catalog projection is missing.
              if (!version.generatedThumbnailStorageId) await ctx.db.patch(version._id, { generatedThumbnailStorageId: existingImage });
              if (effect.releasedCatalog && effect.releasedCatalog.thumbnailStorageId !== existingImage) {
                await ctx.db.patch(effect._id, { releasedCatalog: { ...effect.releasedCatalog, thumbnailStorageId: existingImage } });
              }
            } else {
              await requestThumbnail(ctx, effect._id, version.version, { retryFailed: args.retryFailed, target: "published" });
              requested++;
            }
          }
        }
      }
    }
    return { done: page.isDone, cursor: page.continueCursor, requested };
  },
});
