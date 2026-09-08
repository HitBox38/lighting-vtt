import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

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
