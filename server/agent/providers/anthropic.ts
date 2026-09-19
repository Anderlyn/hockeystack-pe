import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import type Anthropic from "@anthropic-ai/sdk";
import type {
    ChatModel,
    TurnRequest,
    AssistantTurn,
    ModelMessage,
    ToolCall,
    ToolSpec,
} from "../model";
import { config } from "../../config";
import { ProviderError } from "../../exceptions";

const toTools = (tools: ToolSpec[]): Anthropic.Tool[] =>
    tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool["input_schema"],
    }));

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

export class AnthropicModel implements ChatModel {
    readonly id: string;
    private readonly client: AnthropicVertex;
    private readonly model: string;

    constructor(model: string, location: string) {
        this.model = model;
        this.id = `anthropic:${model}`;
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
                max_tokens: 4096,
                system: req.system,
                tools: toTools(req.tools),
                messages: toMessages(req.messages),
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
            };
        } catch (err) {
            throw new ProviderError("Anthropic (Vertex)", this.model, err);
        }
    }
}
