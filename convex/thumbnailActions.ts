"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { thumbnailJobFields as jobFields } from "./schema";
import { renderEffectThumbnailWithMetrics } from "./lib/thumbnailRuntime";
import { ThumbnailProcessError } from "./lib/thumbnailProcess";
import { effectDefinitionSchema } from "../shared/effects";
import { versionDocToDefinition } from "../shared/effectVersion";

export const render = internalAction({
  args: jobFields,
  returns: v.object({ category: v.string(), retryable: v.boolean() }),
  handler: async (ctx, job): Promise<{ category: string; retryable: boolean }> => {
    const input = await ctx.runMutation(internal.thumbnails.begin, job);
    if (!input) return { category: "superseded", retryable: false };
    if (input === "busy") return { category: "duplicate", retryable: false };
    const { definition: version, attempt } = input;
    const started = Date.now();
    let storageId: Id<"_storage"> | undefined;
    let stage = "validate";
    try {
      const definition = effectDefinitionSchema.parse(versionDocToDefinition(version));
      stage = "render";
      const image = await renderEffectThumbnailWithMetrics(definition);
      stage = "storage";
      storageId = await ctx.storage.store(new Blob([new Uint8Array(image.bytes)], { type: "image/png" }));
      const accepted = await ctx.runMutation(internal.thumbnails.finish, { ...job, storageId });
      console.info("effect_thumbnail", { ...job, attempt, durationMs: Date.now() - started, adapter: image.adapter.name, maxRssKiB: image.maxRssKiB, parentMaxRssKiB: process.resourceUsage().maxRSS, accepted });
      return { category: accepted ? "ready" : "superseded", retryable: false };
    } catch (error) {
      if (storageId) await ctx.runMutation(internal.thumbnails.discard, { effectId: job.effectId, storageId });
      const timeout = error instanceof ThumbnailProcessError && error.category === "timeout";
      const shader = stage === "validate" || String(error).includes("shader:") || String(error).includes("WGSL effect contract");
      const deviceLoss = /device.*lost/i.test(String(error));
      const category = timeout ? "timeout" : shader ? "shader" : deviceLoss ? "device_loss" : stage === "storage" ? "storage" : "initialization";
      console.warn("effect_thumbnail_failed", { ...job, attempt, durationMs: Date.now() - started, category });
      return { category, retryable: !timeout && !shader && !deviceLoss };
    }
  },
});
