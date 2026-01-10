import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Upsert summary request (create or update if exists)
export const upsert = mutation({
  args: {
    userId: v.string(),
    source: v.string(),
    videoId: v.string(),
    title: v.string(),
    author: v.string(),
    thumbnailUrl: v.string(),
    length: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("summary_requests")
      .withIndex("by_user_and_video", (q) =>
        q
          .eq("userId", args.userId)
          .eq("source", args.source)
          .eq("videoId", args.videoId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, createdAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("summary_requests", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Get user's summary request history
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("summary_requests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
