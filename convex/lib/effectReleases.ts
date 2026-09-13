import type { Doc } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { findThumbnail } from "./thumbnailJobs";

export async function versionReleasesEnabled(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  return process.env.EFFECT_VERSION_RELEASES_ENABLED === "true" || Boolean(await ctx.db.query("effectReleaseRollout").withIndex("by_name", q => q.eq("name", "versioned")).unique());
}

/** Once a mutation can create private working versions, rollback cannot reopen them. */
export async function retainVersionReleasePolicy(ctx: MutationCtx): Promise<void> {
  if (process.env.EFFECT_VERSION_RELEASES_ENABLED !== "true") return;
  const existing = await ctx.db.query("effectReleaseRollout").withIndex("by_name", q => q.eq("name", "versioned")).unique();
  if (!existing) await ctx.db.insert("effectReleaseRollout", { name: "versioned", activatedAt: Date.now() });
}

export function isReleased(effect: Doc<"effects">, version: Doc<"effectVersions">): boolean {
  return version.releasedAt !== undefined || version.version <= (effect.legacyReleasedThrough ?? 0);
}

export function canReadVersion(effect: Doc<"effects">, version: Doc<"effectVersions">, userId: string | null, versioned: boolean): boolean {
  return effect.authorId === userId || (effect.visibility === "public" &&
    (!versioned || isReleased(effect, version)));
}

export async function releaseSnapshot(ctx: QueryCtx | MutationCtx, effect: Doc<"effects">, version: Doc<"effectVersions">) {
  const thumbnail = await findThumbnail(ctx, effect._id);
  const thumbnailStorageId = version.generatedThumbnailStorageId ?? (thumbnail?.renderedVersion === version.version ? thumbnail.storageId : undefined);
  return {
    name: version.name, description: version.description, category: version.category ?? "Other",
    source: version.source, thumbnailUrl: version.thumbnailUrl, thumbnailKey: version.thumbnailKey,
    ...(thumbnailStorageId ? { thumbnailStorageId } : {}),
  };
}

/** Never attach the latest draft's metadata or generated image to a public response. */
export async function publicEffect(ctx: QueryCtx, effect: Doc<"effects">) {
  const catalog = effect.releasedCatalog;
  const { thumbnailStorageId, ...metadata } = catalog ?? { name: effect.name, description: effect.description };
  const generatedThumbnailUrl = thumbnailStorageId ? await ctx.storage.getUrl(thumbnailStorageId) : null;
  return {
    ...effect, ...metadata,
    searchText: effect.publicSearchText,
    latestVersion: effect.publishedVersion ?? 0,
    thumbnailUrl: catalog?.thumbnailUrl, thumbnailKey: catalog?.thumbnailKey,
    updatedAt: effect.publishedAt ?? effect.updatedAt,
    ...(generatedThumbnailUrl ? { generatedThumbnailUrl, thumbnailVersion: effect.publishedVersion, thumbnailStatus: "ready" } : {}),
  };
}
