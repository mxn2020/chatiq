import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ── Model Capabilities Registry ──────────────────────────────────

export type ModelCapability = "text" | "vision" | "image-gen" | "audio-gen" | "video-gen" |
    "function-calling" | "json-mode" | "streaming" | "long-context";

export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    capabilities: ModelCapability[];
    maxTokens: number;
    contextWindow: number;
    inputCost: number;   // per 1M tokens (USD)
    outputCost: number;  // per 1M tokens (USD)
    tier: "free" | "standard" | "premium";
}

export const MODEL_REGISTRY: ModelInfo[] = [
    // ── OpenAI ───────────────────────────────────────────────────
    {
        id: "gpt-4o", name: "GPT-4o", provider: "openai",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming", "long-context"],
        maxTokens: 16384, contextWindow: 128000, inputCost: 2.5, outputCost: 10, tier: "premium",
    },
    {
        id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming"],
        maxTokens: 16384, contextWindow: 128000, inputCost: 0.15, outputCost: 0.6, tier: "standard",
    },
    {
        id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming", "long-context"],
        maxTokens: 4096, contextWindow: 128000, inputCost: 10, outputCost: 30, tier: "premium",
    },
    {
        id: "o1", name: "o1 (Reasoning)", provider: "openai",
        capabilities: ["text", "function-calling", "streaming", "long-context"],
        maxTokens: 100000, contextWindow: 200000, inputCost: 15, outputCost: 60, tier: "premium",
    },
    {
        id: "dall-e-3", name: "DALL·E 3", provider: "openai",
        capabilities: ["image-gen"], maxTokens: 0, contextWindow: 0, inputCost: 0, outputCost: 40, tier: "premium",
    },
    {
        id: "tts-1", name: "TTS-1", provider: "openai",
        capabilities: ["audio-gen"], maxTokens: 0, contextWindow: 0, inputCost: 15, outputCost: 0, tier: "standard",
    },

    // ── Anthropic ────────────────────────────────────────────────
    {
        id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming", "long-context"],
        maxTokens: 8192, contextWindow: 200000, inputCost: 3, outputCost: 15, tier: "premium",
    },
    {
        id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming"],
        maxTokens: 8192, contextWindow: 200000, inputCost: 0.8, outputCost: 4, tier: "standard",
    },
    {
        id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "anthropic",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming", "long-context"],
        maxTokens: 4096, contextWindow: 200000, inputCost: 15, outputCost: 75, tier: "premium",
    },

    // ── Google ────────────────────────────────────────────────────
    {
        id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming", "long-context"],
        maxTokens: 65536, contextWindow: 1000000, inputCost: 1.25, outputCost: 10, tier: "premium",
    },
    {
        id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming", "long-context"],
        maxTokens: 65536, contextWindow: 1000000, inputCost: 0.15, outputCost: 0.6, tier: "standard",
    },
    {
        id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google",
        capabilities: ["text", "vision", "function-calling", "json-mode", "streaming"],
        maxTokens: 8192, contextWindow: 1000000, inputCost: 0.1, outputCost: 0.4, tier: "standard",
    },
    {
        id: "imagen-3", name: "Imagen 3", provider: "google",
        capabilities: ["image-gen"], maxTokens: 0, contextWindow: 0, inputCost: 0, outputCost: 40, tier: "premium",
    },

    // ── NVIDIA ────────────────────────────────────────────────────
    {
        id: "meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "nvidia",
        capabilities: ["text", "function-calling", "streaming"],
        maxTokens: 4096, contextWindow: 128000, inputCost: 0.35, outputCost: 0.4, tier: "standard",
    },
    {
        id: "meta/llama-3.1-405b-instruct", name: "Llama 3.1 405B", provider: "nvidia",
        capabilities: ["text", "function-calling", "streaming", "long-context"],
        maxTokens: 4096, contextWindow: 128000, inputCost: 2.0, outputCost: 2.0, tier: "premium",
    },
    {
        id: "mistralai/mixtral-8x7b-instruct-v0.1", name: "Mixtral 8x7B", provider: "nvidia",
        capabilities: ["text", "streaming"],
        maxTokens: 4096, contextWindow: 32768, inputCost: 0.2, outputCost: 0.2, tier: "standard",
    },
    {
        id: "google/gemma-2-27b-it", name: "Gemma 2 27B", provider: "nvidia",
        capabilities: ["text", "streaming"],
        maxTokens: 4096, contextWindow: 8192, inputCost: 0.1, outputCost: 0.1, tier: "free",
    },
    {
        id: "stabilityai/stable-diffusion-xl-base-1.0", name: "SDXL 1.0", provider: "nvidia",
        capabilities: ["image-gen"], maxTokens: 0, contextWindow: 0, inputCost: 0, outputCost: 20, tier: "standard",
    },
];

export function getModelInfo(modelId: string): ModelInfo | undefined {
    return MODEL_REGISTRY.find(m => m.id === modelId);
}

export function getModelsByProvider(provider: string): ModelInfo[] {
    return MODEL_REGISTRY.filter(m => m.provider === provider);
}

export function getTextModels(): ModelInfo[] {
    return MODEL_REGISTRY.filter(m => m.capabilities.includes("text"));
}

export function getImageGenModels(): ModelInfo[] {
    return MODEL_REGISTRY.filter(m => m.capabilities.includes("image-gen"));
}

export function getAudioGenModels(): ModelInfo[] {
    return MODEL_REGISTRY.filter(m => m.capabilities.includes("audio-gen"));
}

// ── Unified AI Call Router ───────────────────────────────────────

type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

interface CallModelArgs {
    provider: string;
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    responseFormat?: any;
    caller?: string;
    apiKey?: string;       // User's own key (if not using env var)
}

export async function callModel(ctx: any, args: CallModelArgs): Promise<string> {
    const { provider, model, messages, temperature = 0.7, maxTokens = 2048, topP = 0.9, responseFormat, caller = "chatiq", apiKey } = args;

    switch (provider) {
        case "openai":
            return callOpenAI(ctx, { model, messages, temperature, maxTokens, topP, responseFormat, caller, apiKey });
        case "anthropic":
            return callAnthropic(ctx, { model, messages, temperature, maxTokens, topP, caller, apiKey });
        case "google":
            return callGoogle(ctx, { model, messages, temperature, maxTokens, topP, responseFormat, caller, apiKey });
        case "nvidia":
        default:
            return callNvidia(ctx, { model, messages, temperature, maxTokens, topP, responseFormat, caller });
    }
}

// ── OpenAI Adapter ───────────────────────────────────────────────

async function callOpenAI(ctx: any, args: {
    model: string; messages: ChatMessage[]; temperature: number; maxTokens: number;
    topP: number; responseFormat?: any; caller: string; apiKey?: string;
}): Promise<string> {
    const key = args.apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OpenAI API key not configured. Add it in Settings → Providers.");

    const body: any = {
        model: args.model,
        messages: args.messages.map(m => ({
            role: m.role,
            content: m.content,
        })),
        temperature: args.temperature,
        max_tokens: args.maxTokens,
        top_p: args.topP,
    };
    if (args.responseFormat) body.response_format = args.responseFormat;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content ?? "";
}

// ── Anthropic Adapter ────────────────────────────────────────────

async function callAnthropic(ctx: any, args: {
    model: string; messages: ChatMessage[]; temperature: number; maxTokens: number;
    topP: number; caller: string; apiKey?: string;
}): Promise<string> {
    const key = args.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Anthropic API key not configured. Add it in Settings → Providers.");

    // Extract system message (Anthropic uses separate system param)
    const systemMsg = args.messages.find(m => m.role === "system");
    const nonSystemMsgs = args.messages.filter(m => m.role !== "system");

    const body: any = {
        model: args.model,
        max_tokens: args.maxTokens,
        temperature: args.temperature,
        top_p: args.topP,
        messages: nonSystemMsgs.map(m => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : m.content.map(c => {
                if (c.type === "text") return { type: "text", text: c.text };
                if (c.type === "image_url") return {
                    type: "image",
                    source: { type: "base64", media_type: "image/png", data: c.image_url.url.replace(/^data:image\/\w+;base64,/, "") },
                };
                return c;
            }),
        })),
    };
    if (systemMsg) {
        body.system = typeof systemMsg.content === "string" ? systemMsg.content
            : systemMsg.content.filter(c => c.type === "text").map(c => (c as any).text).join("\n");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = await response.json() as any;
    return data.content?.[0]?.text ?? "";
}

// ── Google Gemini Adapter ────────────────────────────────────────

async function callGoogle(ctx: any, args: {
    model: string; messages: ChatMessage[]; temperature: number; maxTokens: number;
    topP: number; responseFormat?: any; caller: string; apiKey?: string;
}): Promise<string> {
    const key = args.apiKey || process.env.GOOGLE_AI_API_KEY;
    if (!key) throw new Error("Google AI API key not configured. Add it in Settings → Providers.");

    // Convert messages to Gemini format
    const systemMsg = args.messages.find(m => m.role === "system");
    const nonSystemMsgs = args.messages.filter(m => m.role !== "system");

    const contents = nonSystemMsgs.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: typeof m.content === "string"
            ? [{ text: m.content }]
            : m.content.map(c => {
                if (c.type === "text") return { text: c.text };
                if (c.type === "image_url") return {
                    inlineData: { mimeType: "image/png", data: c.image_url.url.replace(/^data:image\/\w+;base64,/, "") },
                };
                return { text: "" };
            }),
    }));

    const body: any = {
        contents,
        generationConfig: {
            temperature: args.temperature,
            maxOutputTokens: args.maxTokens,
            topP: args.topP,
        },
    };
    if (systemMsg) {
        body.systemInstruction = {
            parts: [{ text: typeof systemMsg.content === "string" ? systemMsg.content : "" }],
        };
    }
    if (args.responseFormat?.type === "json_object") {
        body.generationConfig.responseMimeType = "application/json";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${key}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Google AI API error (${response.status}): ${err}`);
    }

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── NVIDIA Adapter (delegates to existing nvidia.ts) ─────────────

async function callNvidia(ctx: any, args: {
    model: string; messages: ChatMessage[]; temperature: number; maxTokens: number;
    topP: number; responseFormat?: any; caller: string;
}): Promise<string> {
    // Import and delegate to existing performNvidiaCall
    const { performNvidiaCall } = await import("./nvidia");
    return performNvidiaCall(ctx, {
        model: args.model,
        messages: args.messages as any,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
        topP: args.topP,
        responseFormat: args.responseFormat,
        caller: args.caller,
    });
}

// ── Provider CRUD (per-user API keys) ────────────────────────────

export const saveProviderKey = mutation({
    args: {
        provider: v.union(
            v.literal("openai"), v.literal("anthropic"),
            v.literal("google"), v.literal("nvidia")
        ),
        apiKey: v.string(),
        label: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Upsert: delete existing, insert new
        const existing = await ctx.db
            .query("providers")
            .withIndex("by_userId_provider", q => q.eq("userId", identity.subject).eq("provider", args.provider))
            .first();
        if (existing) await ctx.db.delete(existing._id);

        const now = Date.now();
        return await ctx.db.insert("providers", {
            userId: identity.subject,
            provider: args.provider,
            apiKey: args.apiKey,
            isActive: true,
            label: args.label,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const removeProviderKey = mutation({
    args: {
        provider: v.union(
            v.literal("openai"), v.literal("anthropic"),
            v.literal("google"), v.literal("nvidia")
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("providers")
            .withIndex("by_userId_provider", q => q.eq("userId", identity.subject).eq("provider", args.provider))
            .first();
        if (existing) await ctx.db.delete(existing._id);
    },
});

export const getProviders = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        const providers = await ctx.db
            .query("providers")
            .withIndex("by_userId", q => q.eq("userId", identity.subject))
            .collect();
        // Mask API keys for security
        return providers.map(p => ({
            ...p,
            apiKey: p.apiKey ? `${p.apiKey.substring(0, 8)}...${p.apiKey.substring(p.apiKey.length - 4)}` : "",
            _rawKey: undefined,
        }));
    },
});

// Internal: get raw API key for a provider
export const getProviderKeyInternal = async (ctx: any, userId: string, provider: string): Promise<string | undefined> => {
    const providerDoc = await ctx.runQuery(internal.providers.getProviderKeyQuery, { userId, provider });
    return providerDoc?.apiKey;
};

import { internalQuery } from "./_generated/server";

export const getProviderKeyQuery = internalQuery({
    args: { userId: v.string(), provider: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("providers")
            .withIndex("by_userId_provider", q => q.eq("userId", args.userId).eq("provider", args.provider as any))
            .first();
    },
});

// ── Content Type Detection ───────────────────────────────────────

export function detectContentType(content: string): { type: string; language?: string } {
    const trimmed = content.trim();

    // JSON detection
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try { JSON.parse(trimmed); return { type: "json" }; } catch { /* not valid JSON */ }
    }

    // YAML detection (starts with --- or has key: value pattern)
    if (trimmed.startsWith("---") || /^[\w-]+:\s/m.test(trimmed)) {
        const yamlIndicators = (trimmed.match(/^[\w-]+:\s/gm) || []).length;
        if (yamlIndicators >= 2) return { type: "yaml" };
    }

    // Code block detection (```language)
    const codeBlockMatch = trimmed.match(/^```(\w+)?\n/);
    if (codeBlockMatch) return { type: "code", language: codeBlockMatch[1] || "plaintext" };

    // Markdown detection (headers, lists, links, bold)
    const mdIndicators = [
        /^#{1,6}\s/m,       // Headers
        /^\*\s/m,           // Unordered list
        /^\d+\.\s/m,        // Ordered list
        /\[.+\]\(.+\)/,     // Links
        /\*\*.+\*\*/,       // Bold
        /```[\s\S]*?```/,   // Code blocks
    ];
    const mdScore = mdIndicators.filter(r => r.test(trimmed)).length;
    if (mdScore >= 2) return { type: "markdown" };

    return { type: "text" };
}
