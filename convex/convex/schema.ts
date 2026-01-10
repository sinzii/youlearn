import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  summary_requests: defineTable({
    userId: v.string(), // Clerk user ID
    source: v.string(), // "youtube" | future sources
    videoId: v.string(),
    title: v.string(),
    author: v.string(),
    thumbnailUrl: v.string(),
    length: v.number(), // seconds
    createdAt: v.number(), // timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_and_video", ["userId", "source", "videoId"]),

  video_transcripts: defineTable({
    source: v.string(), // "youtube" | future sources
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
    createdAt: v.number(),
  }).index("by_source_and_video", ["source", "videoId"]),
});
