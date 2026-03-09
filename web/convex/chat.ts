import { action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { performNvidiaCall } from "./nvidia";

/**
 * Send a message and get an AI response.
 * Handles simple, advanced, and workflow bots.
 */
export const send = action({
    args: {
        conversationId: v.id("conversations"),
        botId: v.id("bots"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // 1. Get bot + config
        const bot = await ctx.runQuery(internal.chat.getBot, { botId: args.botId });
        if (!bot) throw new Error("Bot not found");

        const config = await ctx.runQuery(internal.chat.getBotConfig, { botId: args.botId });
        if (!config) throw new Error("Bot has no configuration");

        // 2. Save user message
        await ctx.runMutation(internal.chat.saveMessage, {
            conversationId: args.conversationId,
            role: "user",
            content: args.content,
            createdAt: Date.now(),
        });

        // 3. Get conversation history (for context)
        const contextWindow = config.contextWindow ?? 10;
        const history = await ctx.runQuery(internal.chat.getHistory, {
            conversationId: args.conversationId,
            limit: contextWindow,
        });

        // 4. Process based on bot type
        let response: string;
        let stepOutputs: Array<{ stepName: string; output: string; isVisible: boolean }> | undefined;
        const startTime = Date.now();

        if (bot.type === "workflow") {
            // Run through workflow steps
            const steps = await ctx.runQuery(internal.chat.getWorkflowStepsInternal, { botId: args.botId });
            if (!steps || steps.length === 0) throw new Error("Workflow has no steps");

            stepOutputs = [];
            let previousOutput = "";

            for (const step of steps) {
                // Build input based on mapping
                let stepInput: string;
                switch (step.inputMapping) {
                    case "user_message":
                        stepInput = args.content;
                        break;
                    case "previous_output":
                        stepInput = previousOutput || args.content;
                        break;
                    case "combined":
                        stepInput = previousOutput
                            ? `User message: ${args.content}\n\nPrevious processing: ${previousOutput}`
                            : args.content;
                        break;
                    case "all_context":
                        stepInput = history
                            .map((m: any) => `${m.role}: ${m.content}`)
                            .join("\n") + `\n\nPrevious processing: ${previousOutput}`;
                        break;
                    default:
                        stepInput = args.content;
                }

                const stepResult = await performNvidiaCall(ctx, {
                    model: step.model || bot.model,
                    messages: [
                        { role: "system", content: step.systemPrompt },
                        { role: "user", content: stepInput },
                    ],
                    temperature: step.temperature ?? config.temperature,
                    maxTokens: step.maxTokens ?? config.maxTokens,
                    caller: `chatiq:${bot.name}:step-${step.order}`,
                });

                previousOutput = stepResult;
                stepOutputs.push({
                    stepName: step.name,
                    output: stepResult,
                    isVisible: step.isVisible,
                });
            }

            // Final response = last visible step's output
            const lastVisible = [...stepOutputs].reverse().find(s => s.isVisible);
            response = lastVisible?.output ?? previousOutput;

        } else {
            // Simple or advanced bot — single call
            const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];

            // System prompt
            let systemContent = config.systemPrompt;
            if (config.personality) {
                systemContent = `Personality: ${config.personality}\n\n${systemContent}`;
            }
            if (config.outputInstructions) {
                systemContent += `\n\nOutput format: ${config.outputFormat ?? "text"}\n${config.outputInstructions}`;
            }
            messages.push({ role: "system", content: systemContent });

            // Few-shot examples (for advanced bots)
            if (config.examples && config.examples.length > 0) {
                for (const ex of config.examples) {
                    messages.push({ role: "user", content: ex.userMessage });
                    messages.push({ role: "assistant", content: ex.assistantResponse });
                }
            }

            // Conversation history
            for (const msg of history) {
                if (msg.role === "user" || msg.role === "assistant") {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }

            // Current message
            messages.push({ role: "user", content: args.content });

            response = await performNvidiaCall(ctx, {
                model: bot.model,
                messages,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                topP: config.topP,
                caller: `chatiq:${bot.name}`,
            });
        }

        const durationMs = Date.now() - startTime;

        // 5. Save assistant message
        await ctx.runMutation(internal.chat.saveMessage, {
            conversationId: args.conversationId,
            role: "assistant",
            content: response,
            botId: args.botId,
            botName: bot.name,
            durationMs,
            stepOutputs,
            createdAt: Date.now(),
        });

        // 6. Update conversation
        await ctx.runMutation(internal.chat.updateConversation, {
            conversationId: args.conversationId,
            botId: args.botId,
        });

        // 7. Increment bot stats
        await ctx.runMutation(internal.bots.incrementMessageCount, { botId: args.botId });

        return { response, durationMs, stepOutputs };
    },
});

// ── Internal helpers ─────────────────────────────────────────────

export const getBot = internalQuery({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) => ctx.db.get(args.botId),
});

export const getBotConfig = internalQuery({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) =>
        ctx.db.query("botConfigs").withIndex("by_botId", q => q.eq("botId", args.botId)).first(),
});

export const getHistory = internalQuery({
    args: { conversationId: v.id("conversations"), limit: v.number() },
    handler: async (ctx, args) => {
        const msgs = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", q => q.eq("conversationId", args.conversationId))
            .order("desc")
            .take(args.limit);
        return msgs.reverse();
    },
});

export const getWorkflowStepsInternal = internalQuery({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) =>
        ctx.db.query("workflowSteps")
            .withIndex("by_botId", q => q.eq("botId", args.botId))
            .collect(),
});

export const saveMessage = internalMutation({
    args: {
        conversationId: v.id("conversations"),
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
        botId: v.optional(v.id("bots")),
        botName: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        stepOutputs: v.optional(v.array(v.object({
            stepName: v.string(),
            output: v.string(),
            isVisible: v.boolean(),
        }))),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => ctx.db.insert("messages", args),
});

export const updateConversation = internalMutation({
    args: { conversationId: v.id("conversations"), botId: v.id("bots") },
    handler: async (ctx, args) => {
        const conv = await ctx.db.get(args.conversationId);
        if (!conv) return;
        await ctx.db.patch(args.conversationId, {
            activeBotId: args.botId,
            messageCount: conv.messageCount + 2,
            lastMessageAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
