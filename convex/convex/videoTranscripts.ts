import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Upsert video transcript
export const upsert = mutation({
  args: {
    source: v.string(),
    videoId: v.string(),
    languageCode: v.string(),
    language: v.string(),
    isGenerated: v.boolean(),
    segments: v.array(
      v.object({
        text: v.string(),
        start: v.float64(),
        duration: v.float64(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("video_transcripts")
      .withIndex("by_source_and_video", (q) =>
        q.eq("source", args.source).eq("videoId", args.videoId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, createdAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("video_transcripts", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Get transcript by video
export const getByVideo = query({
  args: { source: v.string(), videoId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("video_transcripts")
      .withIndex("by_source_and_video", (q) =>
        q.eq("source", args.source).eq("videoId", args.videoId)
      )
      .first();
  },
});
