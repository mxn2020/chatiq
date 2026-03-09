import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Bot CRUD ─────────────────────────────────────────────────────

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        avatar: v.optional(v.string()),
        type: v.union(v.literal("simple"), v.literal("advanced"), v.literal("workflow")),
        model: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const now = Date.now();

        return await ctx.db.insert("bots", {
            userId: identity.subject,
            name: args.name,
            description: args.description,
            avatar: args.avatar,
            type: args.type,
            model: args.model,
            isDefault: false,
            isFavorite: false,
            messageCount: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const update = mutation({
    args: {
        botId: v.id("bots"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        avatar: v.optional(v.string()),
        model: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const bot = await ctx.db.get(args.botId);
        if (!bot || bot.userId !== identity.subject) throw new Error("Not authorized");

        const { botId, ...updates } = args;
        const clean: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(updates)) {
            if (val !== undefined) clean[k] = val;
        }
        clean.updatedAt = Date.now();
        await ctx.db.patch(botId, clean);
    },
});

export const remove = mutation({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const bot = await ctx.db.get(args.botId);
        if (!bot || bot.userId !== identity.subject) throw new Error("Not authorized");
        await ctx.db.delete(args.botId);
    },
});

export const setDefault = mutation({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Unset existing default
        const existing = await ctx.db
            .query("bots")
            .withIndex("by_userId_default", q => q.eq("userId", identity.subject).eq("isDefault", true))
            .collect();
        for (const bot of existing) {
            await ctx.db.patch(bot._id, { isDefault: false });
        }

        await ctx.db.patch(args.botId, { isDefault: true, updatedAt: Date.now() });
    },
});

export const toggleFavorite = mutation({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const bot = await ctx.db.get(args.botId);
        if (!bot || bot.userId !== identity.subject) throw new Error("Not authorized");
        await ctx.db.patch(args.botId, { isFavorite: !bot.isFavorite, updatedAt: Date.now() });
    },
});

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        return await ctx.db
            .query("bots")
            .withIndex("by_userId", q => q.eq("userId", identity.subject))
            .collect();
    },
});

export const getById = query({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.botId);
    },
});

// ── Bot Config ───────────────────────────────────────────────────

export const saveConfig = mutation({
    args: {
        botId: v.id("bots"),
        systemPrompt: v.string(),
        examples: v.optional(v.array(v.object({
            userMessage: v.string(),
            assistantResponse: v.string(),
        }))),
        outputFormat: v.optional(v.union(
            v.literal("text"), v.literal("json"), v.literal("markdown"),
            v.literal("code"), v.literal("structured")
        )),
        outputInstructions: v.optional(v.string()),
        personality: v.optional(v.string()),
        contextWindow: v.optional(v.number()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        topP: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const bot = await ctx.db.get(args.botId);
        if (!bot || bot.userId !== identity.subject) throw new Error("Not authorized");

        // Delete existing config
        const existing = await ctx.db
            .query("botConfigs")
            .withIndex("by_botId", q => q.eq("botId", args.botId))
            .first();
        if (existing) await ctx.db.delete(existing._id);

        const { botId, ...config } = args;
        return await ctx.db.insert("botConfigs", {
            botId,
            ...config,
            createdAt: Date.now(),
        });
    },
});

export const getConfig = query({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("botConfigs")
            .withIndex("by_botId", q => q.eq("botId", args.botId))
            .first();
    },
});

// ── Workflow Steps ───────────────────────────────────────────────

export const saveWorkflowSteps = mutation({
    args: {
        botId: v.id("bots"),
        steps: v.array(v.object({
            name: v.string(),
            description: v.optional(v.string()),
            systemPrompt: v.string(),
            inputMapping: v.union(
                v.literal("user_message"), v.literal("previous_output"),
                v.literal("combined"), v.literal("all_context")
            ),
            model: v.optional(v.string()),
            temperature: v.optional(v.number()),
            maxTokens: v.optional(v.number()),
            isVisible: v.boolean(),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const bot = await ctx.db.get(args.botId);
        if (!bot || bot.userId !== identity.subject) throw new Error("Not authorized");

        // Delete existing steps
        const existing = await ctx.db
            .query("workflowSteps")
            .withIndex("by_botId", q => q.eq("botId", args.botId))
            .collect();
        for (const step of existing) await ctx.db.delete(step._id);

        // Insert new steps
        const now = Date.now();
        for (let i = 0; i < args.steps.length; i++) {
            await ctx.db.insert("workflowSteps", {
                botId: args.botId,
                order: i,
                ...args.steps[i],
                createdAt: now,
            });
        }
    },
});

export const getWorkflowSteps = query({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("workflowSteps")
            .withIndex("by_botId", q => q.eq("botId", args.botId))
            .collect();
    },
});

// ── Internal: increment message count ────────────────────────────

export const incrementMessageCount = internalMutation({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        const bot = await ctx.db.get(args.botId);
        if (!bot) return;
        await ctx.db.patch(args.botId, {
            messageCount: bot.messageCount + 1,
            lastUsedAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
