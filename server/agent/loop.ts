import type { SSEEvent, ChatMessage } from "../../shared/events";
import type { ModelMessage, ToolResult } from "./model";
import { getModel } from "./providers";
import { SYSTEM_PROMPT } from "./system-prompt";
import { toolSpecs, dispatchTool } from "./tools/registry";
import { config } from "../config";
import { logger } from "../logger";

export const runAgent = async (
    history: ChatMessage[],
    emit: (event: SSEEvent) => void,
): Promise<void> => {
    const model = getModel();
    logger.info("agent.request.start", {
        messageCount: history.length,
        model: config.model,
    });

    const messages: ModelMessage[] = history.map((m) =>
        m.role === "assistant"
            ? { role: "assistant", content: m.content, toolCalls: [] }
            : { role: "user", content: m.content },
    );
    const toolContext = {
        emit,
        chartRenders: 0,
    };

    for (let turn = 0; turn < config.maxTurns; turn++) {
        logger.debug("agent.turn.start", { turn: turn + 1 });
        const assistant = await model.runTurn(
            { system: SYSTEM_PROMPT, messages, tools: toolSpecs },
            (delta) => emit({ type: "assistant_delta", text: delta }),
        );

        messages.push({
            role: "assistant",
            content: assistant.text,
            toolCalls: assistant.toolCalls,
        });
        logger.debug("agent.turn.complete", {
            turn: turn + 1,
            stopReason: assistant.stopReason,
            toolCallCount: assistant.toolCalls.length,
            responseLength: assistant.text.length,
        });

        if (
            assistant.stopReason !== "tool_use" ||
            assistant.toolCalls.length === 0
        )
            break;

        const results: ToolResult[] = [];
        for (const tc of assistant.toolCalls) {
            logger.info("agent.tool.call", {
                name: tc.name,
                toolCallId: tc.id,
            });
            emit({
                type: "tool_call",
                id: tc.id,
                name: tc.name,
                input: tc.input,
            });
            const outcome = await dispatchTool(tc.name, tc.input, toolContext);
            emit({
                type: "tool_result",
                id: tc.id,
                name: tc.name,
                ok: !outcome.is_error,
                summary: outcome.content.slice(0, 200),
            });
            logger.info("agent.tool.result", {
                name: tc.name,
                toolCallId: tc.id,
                ok: !outcome.is_error,
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
    logger.info("agent.request.complete", { turns: messages.length });
};
