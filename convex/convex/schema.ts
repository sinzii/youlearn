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

  // Subscriptions table - tracks user subscription status from RevenueCat
  subscriptions: defineTable({
    userId: v.string(), // Clerk user ID (same as RevenueCat appUserID)
    status: v.string(), // "active" | "cancelled" | "expired" | "billing_issue"
    productId: v.optional(v.string()), // e.g., "pro_weekly", "pro_monthly", "pro_yearly"
    expiredAt: v.optional(v.number()), // Timestamp in milliseconds
    isTrial: v.boolean(),
    lastEventType: v.optional(v.string()), // Last RevenueCat event type
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Subscription events log - audit trail of RevenueCat webhook events
  subscription_events: defineTable({
    userId: v.string(),
    eventType: v.string(), // RevenueCat event type
    productId: v.optional(v.string()),
    rawEvent: v.optional(v.string()), // JSON stringified event data
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
