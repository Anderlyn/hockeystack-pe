import type { SSEEvent, ChatMessage } from "../../shared/events";
import type { ModelMessage, ToolResult } from "./model";
import { getModel } from "./providers";
import { SYSTEM_PROMPT } from "./system-prompt";
import { toolSpecs, dispatchTool } from "./tools/registry";
import { config } from "../config";

export const runAgent = async (
    history: ChatMessage[],
    emit: (event: SSEEvent) => void,
): Promise<void> => {
    const model = getModel();

    const messages: ModelMessage[] = history.map((m) =>
        m.role === "assistant"
            ? { role: "assistant", content: m.content, toolCalls: [] }
            : { role: "user", content: m.content },
    );

    for (let turn = 0; turn < config.maxTurns; turn++) {
        const assistant = await model.runTurn(
            { system: SYSTEM_PROMPT, messages, tools: toolSpecs },
            (delta) => emit({ type: "assistant_delta", text: delta }),
        );

        messages.push({
            role: "assistant",
            content: assistant.text,
            toolCalls: assistant.toolCalls,
        });

        if (
            assistant.stopReason !== "tool_use" ||
            assistant.toolCalls.length === 0
        )
            break;

        const results: ToolResult[] = [];
        for (const tc of assistant.toolCalls) {
            emit({
                type: "tool_call",
                id: tc.id,
                name: tc.name,
                input: tc.input,
            });
            const outcome = await dispatchTool(tc.name, tc.input, { emit });
            emit({
                type: "tool_result",
                id: tc.id,
                name: tc.name,
                ok: !outcome.is_error,
                summary: outcome.content.slice(0, 200),
            });
            results.push({
                id: tc.id,
                name: tc.name,
                content: outcome.content,
                isError: outcome.is_error,
            });
        }

        messages.push({ role: "tool", results });
    }

    emit({ type: "done" });
};
