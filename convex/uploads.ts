import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Ownership comes exclusively from signed completion callbacks, never scene data. */
export const isOwner = internalQuery({
  args: { key: v.string(), ownerId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const file = await ctx.db.query("uploadedFiles")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return file?.ownerId === args.ownerId;
  },
});

/** Called only after the UploadThing SDK verifies the provider's callback. */
export const recordCompleted = internalMutation({
  args: { key: v.string(), ownerId: v.string(), url: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.ownerId.trim() || !args.key.trim()) {
      throw new ConvexError("Invalid upload ownership");
    }
    const existing = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      if (existing.ownerId !== args.ownerId) {
        throw new ConvexError("Upload ownership conflict");
      }
      return null;
    }
    await ctx.db.insert("uploadedFiles", args);
    return null;
  },
});
