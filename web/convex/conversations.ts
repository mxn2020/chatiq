import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new conversation.
 */
export const create = mutation({
    args: {
        title: v.optional(v.string()),
        botId: v.optional(v.id("bots")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const now = Date.now();

        return await ctx.db.insert("conversations", {
            userId: identity.subject,
            title: args.title ?? "New Chat",
            activeBotId: args.botId,
            isPinned: false,
            isArchived: false,
            messageCount: 0,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get all conversations for the current user.
 */
export const getAll = query({
    args: { includeArchived: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const convs = await ctx.db
            .query("conversations")
            .withIndex("by_userId", q => q.eq("userId", identity.subject))
            .order("desc")
            .collect();

        if (!args.includeArchived) {
            return convs.filter(c => !c.isArchived);
        }
        return convs;
    },
});

/**
 * Get a single conversation with its messages.
 */
export const getWithMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const conv = await ctx.db.get(args.conversationId);
        if (!conv) return null;

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", q => q.eq("conversationId", args.conversationId))
            .collect();

        return { conversation: conv, messages };
    },
});

/**
 * Update conversation title.
 */
export const rename = mutation({
    args: { conversationId: v.id("conversations"), title: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const conv = await ctx.db.get(args.conversationId);
        if (!conv || conv.userId !== identity.subject) throw new Error("Not authorized");
        await ctx.db.patch(args.conversationId, { title: args.title, updatedAt: Date.now() });
    },
});

/**
 * Toggle pin.
 */
export const togglePin = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const conv = await ctx.db.get(args.conversationId);
        if (!conv || conv.userId !== identity.subject) throw new Error("Not authorized");
        await ctx.db.patch(args.conversationId, { isPinned: !conv.isPinned, updatedAt: Date.now() });
    },
});

/**
 * Archive conversation.
 */
export const archive = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const conv = await ctx.db.get(args.conversationId);
        if (!conv || conv.userId !== identity.subject) throw new Error("Not authorized");
        await ctx.db.patch(args.conversationId, { isArchived: true, updatedAt: Date.now() });
    },
});

/**
 * Delete conversation and all its messages.
 */
export const remove = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const conv = await ctx.db.get(args.conversationId);
        if (!conv || conv.userId !== identity.subject) throw new Error("Not authorized");

        // Delete all messages
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", q => q.eq("conversationId", args.conversationId))
            .collect();
        for (const msg of messages) await ctx.db.delete(msg._id);

        await ctx.db.delete(args.conversationId);
    },
});

/**
 * Switch active bot in a conversation.
 */
export const switchBot = mutation({
    args: { conversationId: v.id("conversations"), botId: v.id("bots") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const conv = await ctx.db.get(args.conversationId);
        if (!conv || conv.userId !== identity.subject) throw new Error("Not authorized");

        // Add system message noting the switch
        const bot = await ctx.db.get(args.botId);
        await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            role: "system",
            content: `Switched to ${bot?.name ?? "Unknown"} bot`,
            botId: args.botId,
            botName: bot?.name,
            createdAt: Date.now(),
        });

        await ctx.db.patch(args.conversationId, {
            activeBotId: args.botId,
            updatedAt: Date.now(),
        });
    },
});
