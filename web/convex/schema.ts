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

    // ── AI Providers ─────────────────────────────────────────────
    // Per-user API key storage for each AI provider.
    providers: defineTable({
        userId: v.string(),
        provider: v.union(
            v.literal("openai"), v.literal("anthropic"),
            v.literal("google"), v.literal("nvidia")
        ),
        apiKey: v.string(),         // Encrypted/hashed in production
        isActive: v.boolean(),
        label: v.optional(v.string()),  // "My OpenAI key"
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_userId_provider", ["userId", "provider"]),

    // ── Bots ─────────────────────────────────────────────────────
    bots: defineTable({
        userId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        avatar: v.optional(v.string()),
        type: v.union(
            v.literal("simple"),
            v.literal("advanced"),
            v.literal("workflow")
        ),
        // Provider + Model
        provider: v.string(),      // "openai", "anthropic", "google", "nvidia"
        model: v.string(),
        // Flags
        isDefault: v.boolean(),
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
    botConfigs: defineTable({
        botId: v.id("bots"),
        systemPrompt: v.string(),
        // Few-shot examples
        examples: v.optional(v.array(v.object({
            userMessage: v.string(),
            assistantResponse: v.string(),
        }))),
        // Output format
        outputFormat: v.optional(v.union(
            v.literal("text"), v.literal("json"), v.literal("markdown"),
            v.literal("yaml"), v.literal("code"), v.literal("structured")
        )),
        outputInstructions: v.optional(v.string()),
        // Structured output
        responseFormat: v.optional(v.union(
            v.literal("text"), v.literal("json_object"), v.literal("json_schema")
        )),
        jsonSchema: v.optional(v.string()),     // JSON schema string for structured output
        // Personality & behavior
        personality: v.optional(v.string()),
        contextWindow: v.optional(v.number()),
        // Model params
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        topP: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_botId", ["botId"]),

    // ── Workflow Nodes ───────────────────────────────────────────
    // For workflow bots: a DAG of processing nodes.
    workflowNodes: defineTable({
        botId: v.id("bots"),
        nodeId: v.string(),     // Client-side unique ID for connections
        nodeType: v.union(
            v.literal("input"),         // Entry point
            v.literal("llm"),           // AI model call
            v.literal("condition"),     // If/else branching
            v.literal("transform"),     // Regex, JSON parse, template
            v.literal("merge"),         // Combine multiple outputs
            v.literal("output")         // Final response
        ),
        name: v.string(),
        description: v.optional(v.string()),
        // Canvas position
        positionX: v.number(),
        positionY: v.number(),
        // LLM node config
        systemPrompt: v.optional(v.string()),
        provider: v.optional(v.string()),
        model: v.optional(v.string()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        // Condition node config
        conditionField: v.optional(v.string()),     // "contains", "length_gt", "regex", "equals"
        conditionValue: v.optional(v.string()),
        // Transform node config
        transformType: v.optional(v.union(
            v.literal("json_parse"), v.literal("json_stringify"),
            v.literal("regex_extract"), v.literal("template"),
            v.literal("yaml_parse"), v.literal("markdown_to_text"),
            v.literal("uppercase"), v.literal("lowercase"), v.literal("trim")
        )),
        transformConfig: v.optional(v.string()),    // Regex pattern, template string, etc.
        // Output node config
        outputFormat: v.optional(v.union(
            v.literal("text"), v.literal("json"), v.literal("yaml"),
            v.literal("markdown"), v.literal("code")
        )),
        // Visibility
        isVisible: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_botId", ["botId"]),

    // ── Workflow Connections ─────────────────────────────────────
    workflowConnections: defineTable({
        botId: v.id("bots"),
        sourceNodeId: v.string(),   // nodeId of source
        targetNodeId: v.string(),   // nodeId of target
        sourcePort: v.string(),     // "output", "true", "false"
        targetPort: v.string(),     // "input"
        createdAt: v.number(),
    })
        .index("by_botId", ["botId"]),

    // ── Conversations ────────────────────────────────────────────
    conversations: defineTable({
        userId: v.string(),
        title: v.string(),
        activeBotId: v.optional(v.id("bots")),
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
        // Content type for smart rendering
        contentType: v.optional(v.union(
            v.literal("text"), v.literal("json"), v.literal("markdown"),
            v.literal("yaml"), v.literal("code"), v.literal("image"),
            v.literal("audio"), v.literal("video")
        )),
        codeLanguage: v.optional(v.string()),
        // Which bot/model generated this
        botId: v.optional(v.id("bots")),
        botName: v.optional(v.string()),
        provider: v.optional(v.string()),
        model: v.optional(v.string()),
        // Token usage
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        // Timing
        durationMs: v.optional(v.number()),
        // Rating
        rating: v.optional(v.union(v.literal("up"), v.literal("down"))),
        // Branching
        parentMessageId: v.optional(v.id("messages")),
        // Workflow step outputs
        stepOutputs: v.optional(v.array(v.object({
            stepName: v.string(),
            output: v.string(),
            isVisible: v.boolean(),
        }))),
        createdAt: v.number(),
    })
        .index("by_conversationId", ["conversationId", "createdAt"]),

    // ── Attachments ──────────────────────────────────────────────
    attachments: defineTable({
        messageId: v.id("messages"),
        type: v.union(
            v.literal("image"), v.literal("audio"),
            v.literal("video"), v.literal("file")
        ),
        storageId: v.optional(v.string()),  // Convex file storage ID
        url: v.optional(v.string()),        // External URL
        fileName: v.string(),
        mimeType: v.string(),
        sizeBytes: v.number(),
        // Processed content
        transcription: v.optional(v.string()),   // For audio
        description: v.optional(v.string()),     // For images (from vision)
        createdAt: v.number(),
    })
        .index("by_messageId", ["messageId"]),

    // ── Generated Media ──────────────────────────────────────────
    generatedMedia: defineTable({
        userId: v.string(),
        type: v.union(
            v.literal("image"), v.literal("audio"), v.literal("video")
        ),
        prompt: v.string(),
        provider: v.string(),
        model: v.string(),
        // Result
        resultUrl: v.optional(v.string()),
        resultBase64: v.optional(v.string()),
        storageId: v.optional(v.string()),
        // Settings
        settings: v.optional(v.string()),   // JSON string of generation settings
        // Status
        status: v.union(
            v.literal("pending"), v.literal("generating"),
            v.literal("completed"), v.literal("failed")
        ),
        error: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_userId", ["userId", "createdAt"])
        .index("by_userId_type", ["userId", "type"]),

    // ── System Prompt Templates ──────────────────────────────────
    promptTemplates: defineTable({
        name: v.string(),
        description: v.string(),
        category: v.string(),       // "coding", "writing", "analysis", etc.
        systemPrompt: v.string(),
        personality: v.optional(v.string()),
        suggestedModel: v.optional(v.string()),
        suggestedProvider: v.optional(v.string()),
        icon: v.optional(v.string()),
        isBuiltIn: v.boolean(),     // Pre-loaded vs user-created
        userId: v.optional(v.string()),
        usageCount: v.number(),
        createdAt: v.number(),
    })
        .index("by_category", ["category"])
        .index("by_isBuiltIn", ["isBuiltIn"]),

    // ── AI Call Logs ─────────────────────────────────────────────
    aiLogs: defineTable({
        requestId: v.string(),
        model: v.string(),
        provider: v.optional(v.string()),
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
