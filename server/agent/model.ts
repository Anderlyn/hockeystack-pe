export interface JSONSchema {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
}

export interface ToolSpec {
    name: string;
    description: string;
    parameters: JSONSchema;
}

export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
}

export interface ToolResult {
    id: string;
    name: string;
    content: string;
    isError?: boolean;
}

export type ModelMessage =
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; toolCalls: ToolCall[] }
    | { role: "tool"; results: ToolResult[] };

export type StopReason = "tool_use" | "end";

export interface TokenUsage {
    uncachedInputTokens: number;
    cachedInputTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
}

export interface AssistantTurn {
    text: string;
    toolCalls: ToolCall[];
    stopReason: StopReason;
    usage: TokenUsage;
}

export interface TurnRequest {
    system: string;
    messages: ModelMessage[];
    tools: ToolSpec[];
}

export interface ChatModel {
    readonly id: string;
    runTurn(
        req: TurnRequest,
        onText: (delta: string) => void,
    ): Promise<AssistantTurn>;
}
