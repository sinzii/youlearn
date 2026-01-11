import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateApiKey } from "./auth";

// Upsert subscription (create or update from RevenueCat webhook)
export const upsert = mutation({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    status: v.string(),
    productId: v.optional(v.string()),
    expiredAt: v.optional(v.number()),
    isTrial: v.boolean(),
    eventType: v.optional(v.string()),
    rawEvent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateApiKey(args.apiKey);

    const { apiKey, eventType, rawEvent, ...subscriptionData } = args;
    const now = Date.now();

    // Check if subscription exists
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...subscriptionData,
        lastEventType: eventType,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        ...subscriptionData,
        lastEventType: eventType,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Log the event for audit trail
    if (eventType) {
      await ctx.db.insert("subscription_events", {
        userId: args.userId,
        eventType,
        productId: args.productId,
        rawEvent,
        createdAt: now,
      });
    }
  },
});

// Get subscription by user ID
export const getByUser = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    validateApiKey(args.apiKey);

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get subscription events for a user (for debugging/audit)
export const getEventsByUser = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    validateApiKey(args.apiKey);

    return await ctx.db
      .query("subscription_events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
