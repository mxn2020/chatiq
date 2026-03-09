import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Bot CRUD ─────────────────────────────────────────────────────

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        avatar: v.optional(v.string()),
        type: v.union(v.literal("simple"), v.literal("advanced"), v.literal("workflow")),
        provider: v.string(),
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
            provider: args.provider,
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
        provider: v.optional(v.string()),
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
            v.literal("yaml"), v.literal("code"), v.literal("structured")
        )),
        outputInstructions: v.optional(v.string()),
        responseFormat: v.optional(v.union(
            v.literal("text"), v.literal("json_object"), v.literal("json_schema")
        )),
        jsonSchema: v.optional(v.string()),
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

// ── Workflow Nodes ───────────────────────────────────────────────

export const saveWorkflowNodes = mutation({
    args: {
        botId: v.id("bots"),
        nodes: v.array(v.object({
            nodeId: v.string(),
            nodeType: v.union(
                v.literal("input"), v.literal("llm"), v.literal("condition"),
                v.literal("transform"), v.literal("merge"), v.literal("output")
            ),
            name: v.string(),
            description: v.optional(v.string()),
            positionX: v.number(),
            positionY: v.number(),
            systemPrompt: v.optional(v.string()),
            provider: v.optional(v.string()),
            model: v.optional(v.string()),
            temperature: v.optional(v.number()),
            maxTokens: v.optional(v.number()),
            conditionField: v.optional(v.string()),
            conditionValue: v.optional(v.string()),
            transformType: v.optional(v.union(
                v.literal("json_parse"), v.literal("json_stringify"),
                v.literal("regex_extract"), v.literal("template"),
                v.literal("yaml_parse"), v.literal("markdown_to_text"),
                v.literal("uppercase"), v.literal("lowercase"), v.literal("trim")
            )),
            transformConfig: v.optional(v.string()),
            outputFormat: v.optional(v.union(
                v.literal("text"), v.literal("json"), v.literal("yaml"),
                v.literal("markdown"), v.literal("code")
            )),
            isVisible: v.boolean(),
        })),
        connections: v.array(v.object({
            sourceNodeId: v.string(),
            targetNodeId: v.string(),
            sourcePort: v.string(),
            targetPort: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const bot = await ctx.db.get(args.botId);
        if (!bot || bot.userId !== identity.subject) throw new Error("Not authorized");

        // Delete existing nodes and connections
        const existingNodes = await ctx.db.query("workflowNodes").withIndex("by_botId", q => q.eq("botId", args.botId)).collect();
        for (const n of existingNodes) await ctx.db.delete(n._id);
        const existingConns = await ctx.db.query("workflowConnections").withIndex("by_botId", q => q.eq("botId", args.botId)).collect();
        for (const c of existingConns) await ctx.db.delete(c._id);

        const now = Date.now();
        // Insert nodes
        for (const node of args.nodes) {
            await ctx.db.insert("workflowNodes", { botId: args.botId, ...node, createdAt: now });
        }
        // Insert connections
        for (const conn of args.connections) {
            await ctx.db.insert("workflowConnections", { botId: args.botId, ...conn, createdAt: now });
        }
    },
});

export const getWorkflowNodes = query({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        const nodes = await ctx.db.query("workflowNodes").withIndex("by_botId", q => q.eq("botId", args.botId)).collect();
        const connections = await ctx.db.query("workflowConnections").withIndex("by_botId", q => q.eq("botId", args.botId)).collect();
        return { nodes, connections };
    },
});

// Keep legacy for backwards compat (old linear steps → converted on read)
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

        // Convert linear steps to nodes + connections
        const nodes = [];
        const connections = [];
        const now = Date.now();

        // Input node
        const inputNodeId = `input-${now}`;
        nodes.push({
            nodeId: inputNodeId, nodeType: "input" as const, name: "User Input",
            positionX: 100, positionY: 200, isVisible: false,
        });

        let prevNodeId = inputNodeId;
        for (let i = 0; i < args.steps.length; i++) {
            const step = args.steps[i];
            const nodeId = `llm-${now}-${i}`;
            nodes.push({
                nodeId, nodeType: "llm" as const, name: step.name,
                description: step.description,
                positionX: 300 + i * 250, positionY: 200,
                systemPrompt: step.systemPrompt,
                model: step.model, temperature: step.temperature, maxTokens: step.maxTokens,
                isVisible: step.isVisible,
            });
            connections.push({
                sourceNodeId: prevNodeId, targetNodeId: nodeId,
                sourcePort: "output", targetPort: "input",
            });
            prevNodeId = nodeId;
        }

        // Output node
        const outputNodeId = `output-${now}`;
        nodes.push({
            nodeId: outputNodeId, nodeType: "output" as const, name: "Response",
            positionX: 300 + args.steps.length * 250, positionY: 200, isVisible: true,
        });
        connections.push({
            sourceNodeId: prevNodeId, targetNodeId: outputNodeId,
            sourcePort: "output", targetPort: "input",
        });

        // Delete existing
        const existingNodes = await ctx.db.query("workflowNodes").withIndex("by_botId", q => q.eq("botId", args.botId)).collect();
        for (const n of existingNodes) await ctx.db.delete(n._id);
        const existingConns = await ctx.db.query("workflowConnections").withIndex("by_botId", q => q.eq("botId", args.botId)).collect();
        for (const c of existingConns) await ctx.db.delete(c._id);

        // Insert
        for (const node of nodes) {
            await ctx.db.insert("workflowNodes", { botId: args.botId, ...node, createdAt: now } as any);
        }
        for (const conn of connections) {
            await ctx.db.insert("workflowConnections", { botId: args.botId, ...conn, createdAt: now });
        }
    },
});

export const getWorkflowSteps = query({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => {
        // Return nodes as legacy format for backwards compat
        const nodes = await ctx.db.query("workflowNodes").withIndex("by_botId", q => q.eq("botId", args.botId)).collect();
        return nodes.filter(n => n.nodeType === "llm");
    },
});

// ── Internal ─────────────────────────────────────────────────────

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
