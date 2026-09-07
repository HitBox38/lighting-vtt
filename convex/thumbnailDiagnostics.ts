"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { ThumbnailProcessError } from "./lib/thumbnailProcess";
import { decodeThumbnailOutput, withThumbnailRuntime } from "./lib/thumbnailRuntime";
import { thumbnailShaderInput } from "../shared/effectThumbnail";
import { THUMBNAIL_FIXTURES } from "../shared/effectThumbnailFixtures";

/** Internal deployment gate. Explicitly opt into retaining diagnostic images. */
export const probe = internalAction({
  args: { timeoutRecovery: v.optional(v.boolean()), effects: v.optional(v.boolean()), retainImages: v.optional(v.boolean()), freshCache: v.optional(v.boolean()) },
  returns: v.object({
    platform: v.string(), arch: v.string(), node: v.string(), durationMs: v.number(),
    images: v.array(v.object({ name: v.string(), adapter: v.string(), maxRssKiB: v.number(), storageId: v.optional(v.id("_storage")), url: v.optional(v.union(v.string(), v.null())) })),
  }),
  handler: async (ctx, args) => {
    const started = Date.now();
    const images = await withThumbnailRuntime(async (run) => {
      if (args.timeoutRecovery) {
        try {
          await run("timeout", {}, 5000);
          throw new Error("Timeout fixture unexpectedly completed");
        } catch (error) {
          if (!(error instanceof ThumbnailProcessError) || error.category !== "timeout") throw error;
        }
        await run("deviceLoss");
        const malformed = thumbnailShaderInput(THUMBNAIL_FIXTURES[0]);
        malformed.source += " invalid WGSL";
        try { await run("effect", { snapshot: malformed }); throw new Error("Malformed WGSL was accepted"); }
        catch (error) { if (!String(error).includes("shader:")) throw error; }
      }
      const fixtures = args.effects ? THUMBNAIL_FIXTURES : [null];
      const results = [];
      for (const definition of fixtures) {
        const image = decodeThumbnailOutput(await run(definition ? "effect" : "render", definition ? { snapshot: thumbnailShaderInput(definition) } : {}));
        const pixels = image.decoded.data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] !== 255) throw new Error("Thumbnail must be opaque");
          if (!definition && (Math.abs(pixels[i] - 51) > 1 || Math.abs(pixels[i + 1] - 102) > 1 || Math.abs(pixels[i + 2] - 204) > 1)) throw new Error("Fixture pixel mismatch");
        }
        const storageId = args.retainImages ? await ctx.storage.store(new Blob([new Uint8Array(image.bytes)], { type: "image/png" })) : undefined;
        results.push({ name: definition?.name ?? "Solid color", adapter: image.adapter.name, maxRssKiB: image.maxRssKiB, ...(storageId ? { storageId, url: await ctx.storage.getUrl(storageId) } : {}) });
      }
      return results;
    }, { freshCache: args.freshCache });
    return { platform: process.platform, arch: process.arch, node: process.version, durationMs: Date.now() - started, images };
  },
});
