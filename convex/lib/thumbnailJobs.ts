import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { THUMBNAIL_SPEC } from "../../shared/effectThumbnail";

export const thumbnailsEnabled = () => process.env.EFFECT_THUMBNAILS_ENABLED === "true";
export const findThumbnail = (ctx: QueryCtx | MutationCtx, effectId: Id<"effects">) =>
  ctx.db.query("effectThumbnails").withIndex("by_effectId", (q) => q.eq("effectId", effectId)).unique();

export async function scheduleThumbnail(ctx: MutationCtx, row: Doc<"effectThumbnails">) {
  if (row.dispatchScheduled || row.workId) return;
  await ctx.scheduler.runAfter(Math.max(0, row.nextRunAt - Date.now()), internal.thumbnails.dispatch, { effectId: row.effectId });
  await ctx.db.patch(row._id, { dispatchScheduled: true });
}

/** Called in the save transaction; rendering and native failures happen later. */
export async function requestThumbnail(ctx: MutationCtx, effectId: Id<"effects">, version: number) {
  if (!thumbnailsEnabled()) return;
  let row = await findThumbnail(ctx, effectId);
  if (row && row.requestedVersion === version && row.rendererRevision === THUMBNAIL_SPEC.revision && row.status !== "canceled") return;
  const patch = {
    requestedVersion: version, rendererRevision: THUMBNAIL_SPEC.revision,
    attempts: 0, nextRunAt: Math.max(Date.now() + 2000, (row?.startedAt ?? 0) + 60_000),
    status: row?.workId ? row.status : "pending" as const, failureCategory: undefined,
  };
  if (row) await ctx.db.patch(row._id, patch);
  else {
    const id = await ctx.db.insert("effectThumbnails", { effectId, ...patch, generation: 0, dispatchScheduled: false });
    row = await ctx.db.get(id);
  }
  if (row) await scheduleThumbnail(ctx, { ...row, ...patch });
}

/** Only call after the containing effect query has enforced visibility. */
export async function withThumbnail(ctx: QueryCtx, effect: Doc<"effects">) {
  const row = await findThumbnail(ctx, effect._id);
  if (!row) return effect;
  const url = row.storageId ? await ctx.storage.getUrl(row.storageId) : null;
  return {
    ...effect,
    ...(url ? { generatedThumbnailUrl: url } : {}),
    thumbnailStatus: row.status,
    ...(row.renderedVersion !== undefined ? { thumbnailVersion: row.renderedVersion } : {}),
  };
}
