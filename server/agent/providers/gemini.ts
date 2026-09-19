import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "node:crypto";
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

export class GeminiModel implements ChatModel {
    readonly id: string;
    private readonly ai: GoogleGenAI;
    private readonly model: string;

    constructor(model: string, location: string) {
        this.model = model;
        this.id = `gemini:${model}`;
        this.ai = new GoogleGenAI({
            vertexai: true,
            project: config.projectId,
            location,
        });
    }

    async runTurn(
        req: TurnRequest,
        onText: (delta: string) => void,
    ): Promise<AssistantTurn> {
        try {
            const stream = await this.ai.models.generateContentStream({
                model: this.model,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                contents: toContents(req.messages) as any,
                config: {
                    systemInstruction: req.system,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tools: toTools(req.tools) as any,
                },
            });

            let text = "";
            const toolCalls: ToolCall[] = [];
            for await (const chunk of stream) {
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
            };
        } catch (err) {
            throw new ProviderError("Gemini (Vertex)", this.model, err);
        }
    }
}
