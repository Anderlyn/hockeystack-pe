import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "node:crypto";
import type {
    ChatModel,
    TurnRequest,
    AssistantTurn,
    ModelMessage,
    ToolCall,
    ToolSpec,
    TokenUsage,
} from "../model";
import type { Config } from "../../config";
import { ProviderError } from "../../exceptions";
import { logger } from "../../logger";

const toGeminiSchema = (schema: unknown): unknown => {
    if (!schema || typeof schema !== "object") return schema;
    const s = schema as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (typeof s.type === "string") out.type = s.type.toUpperCase();
    if (s.description) out.description = s.description;
    if (s.enum) out.enum = s.enum;
    if (s.properties && typeof s.properties === "object") {
        const props: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(
            s.properties as Record<string, unknown>,
        )) {
            props[k] = toGeminiSchema(v);
        }
        out.properties = props;
    }
    if (s.required) out.required = s.required;
    if (s.items) out.items = toGeminiSchema(s.items);
    return out;
};

const toTools = (tools: ToolSpec[]) => [
    {
        functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: toGeminiSchema(t.parameters) as Record<string, unknown>,
        })),
    },
];

const toContents = (messages: ModelMessage[]) => {
    const contents: { role: string; parts: Record<string, unknown>[] }[] = [];
    for (const m of messages) {
        if (m.role === "user") {
            contents.push({ role: "user", parts: [{ text: m.content }] });
        } else if (m.role === "assistant") {
            const parts: Record<string, unknown>[] = [];
            if (m.content) parts.push({ text: m.content });
            for (const tc of m.toolCalls) {
                parts.push({ functionCall: { name: tc.name, args: tc.input } });
            }
            contents.push({ role: "model", parts });
        } else {
            const parts = m.results.map((r) => ({
                functionResponse: {
                    name: r.name,
                    response: r.isError
                        ? { error: r.content }
                        : { result: r.content },
                },
            }));
            contents.push({ role: "user", parts });
        }
    }
    return contents;
};

interface UsageMeta {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
}

const readUsage = (meta: UsageMeta | undefined): TokenUsage => {
    const prompt = meta?.promptTokenCount ?? 0;
    const cached = meta?.cachedContentTokenCount ?? 0;
    return {
        uncachedInputTokens: Math.max(0, prompt - cached),
        cachedInputTokens: cached,
        cacheWriteTokens: 0,
        outputTokens: meta?.candidatesTokenCount ?? 0,
    };
};

export class GeminiModel implements ChatModel {
    readonly id: string;
    private readonly ai: GoogleGenAI;
    private readonly model: string;
    private readonly maxTokens: number;
    private readonly cacheTtlSeconds: number;
    private cacheName: string | null = null;
    private cacheExpiresAt = 0;
    private cacheDisabled = false;
    private cacheInFlight: Promise<string | null> | null = null;

    constructor(model: string, location: string, config: Config) {
        this.model = model;
        this.id = `gemini:${model}`;
        this.maxTokens = config.maxOutputTokens;
        this.cacheTtlSeconds = config.cacheTtlSeconds;
        this.ai = new GoogleGenAI({
            vertexai: true,
            project: config.projectId,
            location,
        });
    }

    private async ensureCache(
        system: string,
        tools: unknown,
    ): Promise<string | null> {
        if (this.cacheDisabled) return null;
        if (this.cacheName && Date.now() < this.cacheExpiresAt)
            return this.cacheName;
        if (this.cacheInFlight) return this.cacheInFlight;

        this.cacheInFlight = (async () => {
            try {
                const cache = await this.ai.caches.create({
                    model: this.model,
                    config: {
                        systemInstruction: system,
                        tools: tools as never,
                        ttl: `${this.cacheTtlSeconds}s`,
                    },
                });
                this.cacheName = cache.name ?? null;
                this.cacheExpiresAt =
                    Date.now() + (this.cacheTtlSeconds - 60) * 1000;
                if (!this.cacheName) this.cacheDisabled = true;
                else
                    logger.info("gemini.cache.created", {
                        name: this.cacheName,
                    });
                return this.cacheName;
            } catch (err) {
                this.cacheDisabled = true;
                logger.warn("gemini.cache.disabled", { error: err });
                return null;
            } finally {
                this.cacheInFlight = null;
            }
        })();
        return this.cacheInFlight;
    }

    async runTurn(
        req: TurnRequest,
        onText: (delta: string) => void,
    ): Promise<AssistantTurn> {
        try {
            const tools = toTools(req.tools);
            const cached = await this.ensureCache(req.system, tools);
            const config = cached
                ? { cachedContent: cached, maxOutputTokens: this.maxTokens }
                : {
                      systemInstruction: req.system,
                      tools: tools as never,
                      maxOutputTokens: this.maxTokens,
                  };

            const stream = await this.ai.models.generateContentStream({
                model: this.model,
                contents: toContents(req.messages) as never,
                config,
            });

            let text = "";
            const toolCalls: ToolCall[] = [];
            let usageMeta: UsageMeta | undefined;
            for await (const chunk of stream) {
                if (chunk.usageMetadata) usageMeta = chunk.usageMetadata;
                const parts = chunk.candidates?.[0]?.content?.parts ?? [];
                for (const part of parts) {
                    if (part.functionCall) {
                        toolCalls.push({
                            id: `call_${randomUUID().slice(0, 8)}`,
                            name: part.functionCall.name ?? "",
                            input: (part.functionCall.args ?? {}) as Record<
                                string,
                                unknown
                            >,
                        });
                    }
                    if (part.thought || typeof part.text !== "string") {
                        continue;
                    }
                    text += part.text;
                    onText(part.text);
                }
            }

            return {
                text,
                toolCalls,
                stopReason: toolCalls.length > 0 ? "tool_use" : "end",
                usage: readUsage(usageMeta),
            };
        } catch (err) {
            throw new ProviderError("Gemini (Vertex)", this.model, err);
        }
    }
}
