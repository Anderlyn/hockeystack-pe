import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import type Anthropic from "@anthropic-ai/sdk";
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

const CACHE_CONTROL = { type: "ephemeral" } as const;

const toTools = (tools: ToolSpec[]): Anthropic.Tool[] =>
    tools.map((t, index) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool["input_schema"],
        ...(index === tools.length - 1 ? { cache_control: CACHE_CONTROL } : {}),
    }));

const toSystem = (system: string): Anthropic.TextBlockParam[] => [
    { type: "text", text: system, cache_control: CACHE_CONTROL },
];

const toMessages = (messages: ModelMessage[]): Anthropic.MessageParam[] =>
    messages.map((m): Anthropic.MessageParam => {
        if (m.role === "user") return { role: "user", content: m.content };
        if (m.role === "assistant") {
            const blocks: Anthropic.ContentBlockParam[] = [];
            if (m.content) blocks.push({ type: "text", text: m.content });
            for (const tc of m.toolCalls) {
                blocks.push({
                    type: "tool_use",
                    id: tc.id,
                    name: tc.name,
                    input: tc.input,
                });
            }
            return { role: "assistant", content: blocks };
        }
        const blocks: Anthropic.ContentBlockParam[] = m.results.map((r) => ({
            type: "tool_result",
            tool_use_id: r.id,
            content: r.content,
            is_error: r.isError,
        }));
        return { role: "user", content: blocks };
    });

const withPrefixCache = (
    messages: Anthropic.MessageParam[],
): Anthropic.MessageParam[] => {
    const last = messages[messages.length - 1];
    if (!last) return messages;
    const blocks = Array.isArray(last.content)
        ? last.content
        : [{ type: "text", text: last.content } as Anthropic.ContentBlockParam];
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock) return messages;
    const cachedBlocks = [
        ...blocks.slice(0, -1),
        { ...lastBlock, cache_control: CACHE_CONTROL },
    ];
    return [...messages.slice(0, -1), { ...last, content: cachedBlocks }];
};

const readUsage = (usage: Anthropic.Usage): TokenUsage => ({
    uncachedInputTokens: usage.input_tokens ?? 0,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
});

export class AnthropicModel implements ChatModel {
    readonly id: string;
    private readonly client: AnthropicVertex;
    private readonly model: string;
    private readonly maxTokens: number;

    constructor(model: string, location: string, config: Config) {
        this.model = model;
        this.id = `anthropic:${model}`;
        this.maxTokens = config.maxOutputTokens;
        this.client = new AnthropicVertex({
            projectId: config.projectId,
            region: location,
        });
    }

    async runTurn(
        req: TurnRequest,
        onText: (delta: string) => void,
    ): Promise<AssistantTurn> {
        try {
            const stream = this.client.messages.stream({
                model: this.model,
                max_tokens: this.maxTokens,
                system: toSystem(req.system),
                tools: toTools(req.tools),
                messages: withPrefixCache(toMessages(req.messages)),
            });
            stream.on("text", (delta: string) => onText(delta));
            const msg = await stream.finalMessage();

            let text = "";
            const toolCalls: ToolCall[] = [];
            for (const block of msg.content) {
                if (block.type === "text") text += block.text;
                else if (block.type === "tool_use") {
                    toolCalls.push({
                        id: block.id,
                        name: block.name,
                        input: (block.input ?? {}) as Record<string, unknown>,
                    });
                }
            }
            return {
                text,
                toolCalls,
                stopReason: msg.stop_reason === "tool_use" ? "tool_use" : "end",
                usage: readUsage(msg.usage),
            };
        } catch (err) {
            throw new ProviderError("Anthropic (Vertex)", this.model, err);
        }
    }
}
