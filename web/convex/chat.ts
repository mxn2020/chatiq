import { action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { callModel, detectContentType } from "./providers";

/**
 * Send a message and get an AI response.
 * Supports multi-provider, simple/advanced/workflow bots,
 * structured output (JSON/YAML), and content type detection.
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

        // 2. Get user's API key for this provider (fallback to env vars)
        const providerKey = await ctx.runQuery(internal.providers.getProviderKeyQuery, {
            userId: identity.subject,
            provider: bot.provider,
        });

        // 3. Save user message
        await ctx.runMutation(internal.chat.saveMessage, {
            conversationId: args.conversationId,
            role: "user",
            content: args.content,
            contentType: "text",
            createdAt: Date.now(),
        });

        // 4. Get conversation history
        const contextWindow = config.contextWindow ?? 10;
        const history = await ctx.runQuery(internal.chat.getHistory, {
            conversationId: args.conversationId,
            limit: contextWindow,
        });

        // 5. Process based on bot type
        let response: string;
        let stepOutputs: Array<{ stepName: string; output: string; isVisible: boolean }> | undefined;
        const startTime = Date.now();

        if (bot.type === "workflow") {
            const result = await executeWorkflow(ctx, {
                botId: args.botId,
                provider: bot.provider,
                model: bot.model,
                config,
                userMessage: args.content,
                history,
                apiKey: providerKey?.apiKey,
                botName: bot.name,
            });
            response = result.response;
            stepOutputs = result.stepOutputs;
        } else {
            response = await executeSingleCall(ctx, {
                provider: bot.provider,
                model: bot.model,
                config,
                userMessage: args.content,
                history,
                apiKey: providerKey?.apiKey,
                botName: bot.name,
            });
        }

        const durationMs = Date.now() - startTime;

        // 6. Detect content type
        const detected = detectContentType(response);

        // 7. Save assistant message
        await ctx.runMutation(internal.chat.saveMessage, {
            conversationId: args.conversationId,
            role: "assistant",
            content: response,
            contentType: detected.type,
            codeLanguage: detected.language,
            botId: args.botId,
            botName: bot.name,
            provider: bot.provider,
            model: bot.model,
            durationMs,
            stepOutputs,
            createdAt: Date.now(),
        });

        // 8. Update conversation
        await ctx.runMutation(internal.chat.updateConversation, {
            conversationId: args.conversationId,
            botId: args.botId,
        });

        // 9. Increment bot stats
        await ctx.runMutation(internal.bots.incrementMessageCount, { botId: args.botId });

        return { response, durationMs, stepOutputs, contentType: detected.type };
    },
});

/**
 * Rate a message (thumbs up/down).
 */
export const rateMessage = action({
    args: {
        messageId: v.id("messages"),
        rating: v.union(v.literal("up"), v.literal("down")),
    },
    handler: async (ctx, args) => {
        await ctx.runMutation(internal.chat.setRating, {
            messageId: args.messageId,
            rating: args.rating,
        });
    },
});

/**
 * Retry: re-send the previous user message to get a new response.
 */
export const retry = action({
    args: {
        conversationId: v.id("conversations"),
        messageId: v.id("messages"),     // The assistant message to retry
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Get the assistant message
        const assistantMsg = await ctx.runQuery(internal.chat.getMessage, { messageId: args.messageId });
        if (!assistantMsg || assistantMsg.role !== "assistant") throw new Error("Can only retry assistant messages");

        // Find the preceding user message
        const history = await ctx.runQuery(internal.chat.getHistory, {
            conversationId: args.conversationId,
            limit: 50,
        });
        const msgIndex = history.findIndex((m: any) => m._id === args.messageId);
        if (msgIndex <= 0) throw new Error("No preceding user message found");
        const userMsg = history[msgIndex - 1];
        if (userMsg.role !== "user") throw new Error("Previous message is not from user");

        // Delete the old assistant message
        await ctx.runMutation(internal.chat.deleteMessage, { messageId: args.messageId });

        // Re-send
        const botId = assistantMsg.botId;
        if (!botId) throw new Error("No bot associated with this message");

        // Decrement conversation message count
        await ctx.runMutation(internal.chat.decrementConversationCount, { conversationId: args.conversationId });

        // Use the send action to re-process
        const bot = await ctx.runQuery(internal.chat.getBot, { botId });
        if (!bot) throw new Error("Bot not found");

        const config = await ctx.runQuery(internal.chat.getBotConfig, { botId });
        if (!config) throw new Error("Bot config not found");

        const providerKey = await ctx.runQuery(internal.providers.getProviderKeyQuery, {
            userId: identity.subject,
            provider: bot.provider,
        });

        const contextWindow = config.contextWindow ?? 10;
        const freshHistory = await ctx.runQuery(internal.chat.getHistory, {
            conversationId: args.conversationId,
            limit: contextWindow,
        });

        const startTime = Date.now();
        let response: string;

        if (bot.type === "workflow") {
            const result = await executeWorkflow(ctx, {
                botId, provider: bot.provider, model: bot.model, config,
                userMessage: userMsg.content, history: freshHistory,
                apiKey: providerKey?.apiKey, botName: bot.name,
            });
            response = result.response;
        } else {
            response = await executeSingleCall(ctx, {
                provider: bot.provider, model: bot.model, config,
                userMessage: userMsg.content, history: freshHistory,
                apiKey: providerKey?.apiKey, botName: bot.name,
            });
        }

        const durationMs = Date.now() - startTime;
        const detected = detectContentType(response);

        await ctx.runMutation(internal.chat.saveMessage, {
            conversationId: args.conversationId,
            role: "assistant",
            content: response,
            contentType: detected.type,
            codeLanguage: detected.language,
            botId, botName: bot.name,
            provider: bot.provider, model: bot.model,
            durationMs, createdAt: Date.now(),
        });

        await ctx.runMutation(internal.chat.updateConversation, {
            conversationId: args.conversationId, botId,
        });

        return { response, durationMs, contentType: detected.type };
    },
});

// ── Single Call (Simple / Advanced) ──────────────────────────────

async function executeSingleCall(ctx: any, args: {
    provider: string; model: string; config: any;
    userMessage: string; history: any[]; apiKey?: string; botName: string;
}): Promise<string> {
    const { provider, model, config, userMessage, history, apiKey, botName } = args;
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];

    // System prompt
    let systemContent = config.systemPrompt;
    if (config.personality) {
        systemContent = `Personality: ${config.personality}\n\n${systemContent}`;
    }
    if (config.outputInstructions) {
        systemContent += `\n\nOutput format: ${config.outputFormat ?? "text"}\n${config.outputInstructions}`;
    }
    if (config.responseFormat === "json_object") {
        systemContent += "\n\nIMPORTANT: Respond with valid JSON only.";
    }
    if (config.jsonSchema) {
        systemContent += `\n\nYour response must conform to this JSON schema:\n${config.jsonSchema}`;
    }
    messages.push({ role: "system", content: systemContent });

    // Few-shot examples
    if (config.examples?.length > 0) {
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
    messages.push({ role: "user", content: userMessage });

    // Build response format
    let responseFormat: any;
    if (config.responseFormat === "json_object") {
        responseFormat = { type: "json_object" };
    } else if (config.responseFormat === "json_schema" && config.jsonSchema) {
        try {
            responseFormat = { type: "json_schema", json_schema: JSON.parse(config.jsonSchema) };
        } catch { /* invalid schema, skip */ }
    }

    return callModel(ctx, {
        provider, model, messages,
        temperature: config.temperature, maxTokens: config.maxTokens, topP: config.topP,
        responseFormat, caller: `chatiq:${botName}`, apiKey,
    });
}

// ── Workflow Execution (DAG-based) ───────────────────────────────

async function executeWorkflow(ctx: any, args: {
    botId: any; provider: string; model: string; config: any;
    userMessage: string; history: any[]; apiKey?: string; botName: string;
}): Promise<{ response: string; stepOutputs: Array<{ stepName: string; output: string; isVisible: boolean }> }> {
    const { botId, provider, model, config, userMessage, history, apiKey, botName } = args;

    // Get nodes and connections
    const nodesRaw = await ctx.runQuery(internal.chat.getWorkflowNodesInternal, { botId });
    const connsRaw = await ctx.runQuery(internal.chat.getWorkflowConnsInternal, { botId });

    if (!nodesRaw || nodesRaw.length === 0) throw new Error("Workflow has no nodes");

    // Build adjacency map
    const nodeMap = new Map<string, any>();
    for (const n of nodesRaw) nodeMap.set(n.nodeId, n);

    const adjacency = new Map<string, string[]>();  // sourceNodeId → [targetNodeIds]
    for (const c of connsRaw) {
        if (!adjacency.has(c.sourceNodeId)) adjacency.set(c.sourceNodeId, []);
        adjacency.get(c.sourceNodeId)!.push(c.targetNodeId);
    }

    // Find entry point (input node)
    const inputNode = nodesRaw.find((n: any) => n.nodeType === "input");
    if (!inputNode) throw new Error("Workflow has no input node");

    // Topological execution
    const outputs = new Map<string, string>();
    const stepOutputs: Array<{ stepName: string; output: string; isVisible: boolean }> = [];
    const visited = new Set<string>();

    async function executeNode(nodeId: string): Promise<string> {
        if (outputs.has(nodeId)) return outputs.get(nodeId)!;
        if (visited.has(nodeId)) return ""; // Cycle protection
        visited.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) return "";

        let result = "";

        switch (node.nodeType) {
            case "input":
                result = userMessage;
                break;

            case "llm": {
                // Get input from parent nodes
                const parents = connsRaw.filter((c: any) => c.targetNodeId === nodeId);
                let input = "";
                for (const p of parents) {
                    const parentOutput = await executeNode(p.sourceNodeId);
                    input += parentOutput ? `${input ? "\n\n" : ""}${parentOutput}` : "";
                }
                if (!input) input = userMessage;

                const nodeProvider = node.provider || provider;
                const nodeModel = node.model || model;

                const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
                if (node.systemPrompt) {
                    messages.push({ role: "system", content: node.systemPrompt });
                }
                // Include conversation context for first LLM node
                if (parents.some((p: any) => nodeMap.get(p.sourceNodeId)?.nodeType === "input")) {
                    for (const msg of history) {
                        if (msg.role === "user" || msg.role === "assistant") {
                            messages.push({ role: msg.role, content: msg.content });
                        }
                    }
                }
                messages.push({ role: "user", content: input });

                result = await callModel(ctx, {
                    provider: nodeProvider, model: nodeModel, messages,
                    temperature: node.temperature ?? config.temperature,
                    maxTokens: node.maxTokens ?? config.maxTokens,
                    caller: `chatiq:${botName}:${node.name}`, apiKey,
                });

                stepOutputs.push({ stepName: node.name, output: result, isVisible: node.isVisible });
                break;
            }

            case "condition": {
                // Get input from parent
                const condParents = connsRaw.filter((c: any) => c.targetNodeId === nodeId);
                let condInput = "";
                for (const p of condParents) {
                    condInput = await executeNode(p.sourceNodeId);
                }

                // Evaluate condition
                let condResult = false;
                const val = node.conditionValue || "";
                switch (node.conditionField) {
                    case "contains":
                        condResult = condInput.toLowerCase().includes(val.toLowerCase());
                        break;
                    case "length_gt":
                        condResult = condInput.length > parseInt(val);
                        break;
                    case "regex":
                        try { condResult = new RegExp(val, "i").test(condInput); } catch { condResult = false; }
                        break;
                    case "equals":
                        condResult = condInput.trim().toLowerCase() === val.toLowerCase();
                        break;
                    default:
                        condResult = !!condInput;
                }

                // Route to "true" or "false" port children
                const trueChildren = connsRaw.filter((c: any) => c.sourceNodeId === nodeId && c.sourcePort === "true");
                const falseChildren = connsRaw.filter((c: any) => c.sourceNodeId === nodeId && c.sourcePort === "false");
                const targetConns = condResult ? trueChildren : falseChildren;

                // Store the input as this node's output (pass-through)
                result = condInput;

                // Execute the chosen branch
                for (const tc of targetConns) {
                    result = await executeNode(tc.targetNodeId);
                }
                break;
            }

            case "transform": {
                const transformParents = connsRaw.filter((c: any) => c.targetNodeId === nodeId);
                let tInput = "";
                for (const p of transformParents) {
                    tInput = await executeNode(p.sourceNodeId);
                }

                switch (node.transformType) {
                    case "json_parse":
                        try { result = JSON.stringify(JSON.parse(tInput), null, 2); } catch { result = tInput; }
                        break;
                    case "json_stringify":
                        result = JSON.stringify(tInput);
                        break;
                    case "regex_extract": {
                        try {
                            const match = tInput.match(new RegExp(node.transformConfig || ".*"));
                            result = match?.[1] || match?.[0] || tInput;
                        } catch { result = tInput; }
                        break;
                    }
                    case "template":
                        result = (node.transformConfig || "{{input}}").replace(/\{\{input\}\}/g, tInput);
                        break;
                    case "uppercase": result = tInput.toUpperCase(); break;
                    case "lowercase": result = tInput.toLowerCase(); break;
                    case "trim": result = tInput.trim(); break;
                    default: result = tInput;
                }

                stepOutputs.push({ stepName: node.name, output: result, isVisible: node.isVisible });
                break;
            }

            case "merge": {
                const mergeParents = connsRaw.filter((c: any) => c.targetNodeId === nodeId);
                const parts: string[] = [];
                for (const p of mergeParents) {
                    parts.push(await executeNode(p.sourceNodeId));
                }
                result = parts.filter(Boolean).join("\n\n---\n\n");
                break;
            }

            case "output": {
                const outputParents = connsRaw.filter((c: any) => c.targetNodeId === nodeId);
                for (const p of outputParents) {
                    result = await executeNode(p.sourceNodeId);
                }
                // Apply output format
                if (node.outputFormat === "json") {
                    try { result = JSON.stringify(JSON.parse(result), null, 2); } catch { /* keep as-is */ }
                }
                break;
            }
        }

        outputs.set(nodeId, result);
        return result;
    }

    // Find the output node(s) and execute
    const outputNodes = nodesRaw.filter((n: any) => n.nodeType === "output");
    let finalResponse = "";

    if (outputNodes.length > 0) {
        for (const outNode of outputNodes) {
            finalResponse = await executeNode(outNode.nodeId);
        }
    } else {
        // No output node — find leaf nodes (no outgoing connections)
        const sourcesSet = new Set(connsRaw.map((c: any) => c.sourceNodeId));
        const leafNodes = nodesRaw.filter((n: any) => !sourcesSet.has(n.nodeId) && n.nodeType !== "input");
        for (const leaf of leafNodes) {
            finalResponse = await executeNode(leaf.nodeId);
        }
    }

    // If no output found, get last visible step
    if (!finalResponse && stepOutputs.length > 0) {
        const lastVisible = [...stepOutputs].reverse().find(s => s.isVisible);
        finalResponse = lastVisible?.output ?? stepOutputs[stepOutputs.length - 1].output;
    }

    return { response: finalResponse, stepOutputs };
}

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

export const getMessage = internalQuery({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => ctx.db.get(args.messageId),
});

export const getWorkflowNodesInternal = internalQuery({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) =>
        ctx.db.query("workflowNodes").withIndex("by_botId", q => q.eq("botId", args.botId)).collect(),
});

export const getWorkflowConnsInternal = internalQuery({
    args: { botId: v.id("bots") },
    handler: async (ctx, args) =>
        ctx.db.query("workflowConnections").withIndex("by_botId", q => q.eq("botId", args.botId)).collect(),
});

export const saveMessage = internalMutation({
    args: {
        conversationId: v.id("conversations"),
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
        contentType: v.optional(v.string()),
        codeLanguage: v.optional(v.string()),
        botId: v.optional(v.id("bots")),
        botName: v.optional(v.string()),
        provider: v.optional(v.string()),
        model: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        stepOutputs: v.optional(v.array(v.object({
            stepName: v.string(),
            output: v.string(),
            isVisible: v.boolean(),
        }))),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => ctx.db.insert("messages", args as any),
});

export const deleteMessage = internalMutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => ctx.db.delete(args.messageId),
});

export const setRating = internalMutation({
    args: { messageId: v.id("messages"), rating: v.union(v.literal("up"), v.literal("down")) },
    handler: async (ctx, args) => ctx.db.patch(args.messageId, { rating: args.rating }),
});

export const decrementConversationCount = internalMutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const conv = await ctx.db.get(args.conversationId);
        if (!conv) return;
        await ctx.db.patch(args.conversationId, {
            messageCount: Math.max(0, conv.messageCount - 1),
            updatedAt: Date.now(),
        });
    },
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
