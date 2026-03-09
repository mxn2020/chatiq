import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
    ...authTables,

    // ── User Profiles ────────────────────────────────────────────
    userProfiles: defineTable({
        userId: v.string(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_userId", ["userId"]),

    // ── Subscription Plans ───────────────────────────────────────
    subscriptionPlans: defineTable({
        name: v.string(),
        stripePriceId: v.string(),
        price: v.number(),
        interval: v.union(v.literal("month"), v.literal("year")),
        features: v.array(v.string()),
        isActive: v.boolean(),
        sortOrder: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_isActive", ["isActive", "sortOrder"]),

    // ── Bots ─────────────────────────────────────────────────────
    // A bot is a chatbot persona created by the user.
    bots: defineTable({
        userId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        avatar: v.optional(v.string()),           // Emoji or URL
        type: v.union(
            v.literal("simple"),                   // Single system prompt
            v.literal("advanced"),                 // System prompt + examples + constraints
            v.literal("workflow")                  // Multi-step processing chain
        ),
        // Default model (can be overridden per node in workflows)
        model: v.string(),
        isDefault: v.boolean(),                    // Default bot for new conversations
        isFavorite: v.boolean(),
        // Stats
        messageCount: v.number(),
        lastUsedAt: v.optional(v.number()),
        // Status
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_userId_default", ["userId", "isDefault"])
        .index("by_userId_favorite", ["userId", "isFavorite"]),

    // ── Bot Configs ──────────────────────────────────────────────
    // The actual prompt configuration for a bot.
    botConfigs: defineTable({
        botId: v.id("bots"),
        // System prompt
        systemPrompt: v.string(),
        // Advanced: few-shot examples
        examples: v.optional(v.array(v.object({
            userMessage: v.string(),
            assistantResponse: v.string(),
        }))),
        // Advanced: constraints & formatting
        outputFormat: v.optional(v.union(
            v.literal("text"), v.literal("json"), v.literal("markdown"),
            v.literal("code"), v.literal("structured")
        )),
        outputInstructions: v.optional(v.string()),
        // Advanced: personality & behavior
        personality: v.optional(v.string()),       // "friendly", "professional", "creative"
        contextWindow: v.optional(v.number()),     // How many past messages to include
        // Model overrides
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        topP: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_botId", ["botId"]),

    // ── Workflow Steps ───────────────────────────────────────────
    // For workflow bots: an ordered chain of processing steps.
    // Each step processes the user message through its own prompt.
    workflowSteps: defineTable({
        botId: v.id("bots"),
        order: v.number(),
        name: v.string(),
        description: v.optional(v.string()),
        systemPrompt: v.string(),
        // How this step receives input
        inputMapping: v.union(
            v.literal("user_message"),             // Original user message
            v.literal("previous_output"),          // Output of previous step
            v.literal("combined"),                 // User message + previous output
            v.literal("all_context")               // Full conversation + previous output
        ),
        // Model for this specific step (null = use bot default)
        model: v.optional(v.string()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        // Whether to show this step's output to the user
        isVisible: v.boolean(),                    // If false, output is only passed to next step
        createdAt: v.number(),
    })
        .index("by_botId", ["botId", "order"]),

    // ── Conversations ────────────────────────────────────────────
    conversations: defineTable({
        userId: v.string(),
        title: v.string(),
        activeBotId: v.optional(v.id("bots")),     // Currently active bot
        isPinned: v.boolean(),
        isArchived: v.boolean(),
        messageCount: v.number(),
        lastMessageAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_userId", ["userId", "updatedAt"])
        .index("by_userId_pinned", ["userId", "isPinned"])
        .index("by_userId_archived", ["userId", "isArchived"]),

    // ── Messages ─────────────────────────────────────────────────
    messages: defineTable({
        conversationId: v.id("conversations"),
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
        // Which bot generated this response
        botId: v.optional(v.id("bots")),
        botName: v.optional(v.string()),
        // Token usage
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        // Timing
        durationMs: v.optional(v.number()),
        // Workflow step outputs (for workflow bots)
        stepOutputs: v.optional(v.array(v.object({
            stepName: v.string(),
            output: v.string(),
            isVisible: v.boolean(),
        }))),
        createdAt: v.number(),
    })
        .index("by_conversationId", ["conversationId", "createdAt"]),

    // ── AI Call Logs ─────────────────────────────────────────────
    aiLogs: defineTable({
        requestId: v.string(),
        model: v.string(),
        caller: v.string(),
        timestamp: v.number(),
        durationMs: v.number(),
        systemPrompt: v.string(),
        userPromptText: v.string(),
        hasImage: v.boolean(),
        imageSizeBytes: v.optional(v.number()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        requestBodySize: v.number(),
        status: v.union(v.literal("success"), v.literal("error")),
        httpStatus: v.number(),
        responseContent: v.string(),
        responseSize: v.number(),
        finishReason: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        inputCostUsd: v.optional(v.number()),
        outputCostUsd: v.optional(v.number()),
        totalCostUsd: v.optional(v.number()),
    })
        .index("by_timestamp", ["timestamp"])
        .index("by_model", ["model"])
        .index("by_caller", ["caller"])
        .index("by_status", ["status"]),

    // ── Dev Logs ─────────────────────────────────────────────────
    devLogs: defineTable({
        level: v.union(v.literal("debug"), v.literal("info"), v.literal("warn"), v.literal("error")),
        message: v.string(),
        context: v.optional(v.string()),
        component: v.string(),
        timestamp: v.number(),
        userId: v.optional(v.string()),
        metadata: v.optional(v.string()),
    })
        .index("by_timestamp", ["timestamp"])
        .index("by_level_timestamp", ["level", "timestamp"])
        .index("by_component", ["component", "timestamp"]),

    // ── Audit Logs ───────────────────────────────────────────────
    auditLogs: defineTable({
        userId: v.string(),
        action: v.string(),
        target: v.string(),
        targetId: v.optional(v.string()),
        details: v.optional(v.string()),
        timestamp: v.number(),
    })
        .index("by_timestamp", ["timestamp"])
        .index("by_userId", ["userId", "timestamp"]),

    // ── Model Costs ──────────────────────────────────────────────
    modelCosts: defineTable({
        model: v.string(),
        provider: v.string(),
        inputCostPer1k: v.number(),
        outputCostPer1k: v.number(),
        isActive: v.boolean(),
        updatedAt: v.number(),
    })
        .index("by_model", ["model"]),

    // ── Model Tests ──────────────────────────────────────────────
    modelTests: defineTable({
        model: v.string(),
        prompt: v.string(),
        expectedOutput: v.optional(v.string()),
        actualOutput: v.optional(v.string()),
        status: v.union(v.literal("pending"), v.literal("running"), v.literal("passed"), v.literal("failed")),
        durationMs: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_model", ["model"])
        .index("by_status", ["status"]),

    // ── Rate Limits ──────────────────────────────────────────────
    rateLimits: defineTable({
        key: v.string(),
        tokens: v.number(),
        lastRefill: v.number(),
    }).index("by_key", ["key"]),

    // ── Usage Limits ─────────────────────────────────────────────
    usageLimits: defineTable({
        userId: v.string(),
        period: v.string(),
        requestCount: v.number(),
        tokenCount: v.number(),
        lastReset: v.number(),
    }).index("by_userId_period", ["userId", "period"]),
});
