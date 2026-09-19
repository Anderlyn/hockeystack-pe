import type { SSEEvent, ChatMessage } from "../../shared/events";
import type { ChatModel, ModelMessage, ToolResult, ToolSpec } from "./model";
import type { Config } from "../config";
import type { BigQueryService } from "../bq/service";
import type { UsageService } from "../usage";
import type { ToolContext, ToolExecResult } from "./tools/types";
import { logger } from "../logger";

export interface AgentDeps {
    model: ChatModel;
    bq: BigQueryService;
    usage: UsageService;
    config: Config;
    systemPrompt: string;
    toolSpecs: ToolSpec[];
    dispatchTool: (
        name: string,
        input: unknown,
        ctx: ToolContext,
    ) => Promise<ToolExecResult>;
}

export interface Agent {
    run: (
        userId: string,
        history: ChatMessage[],
        emit: (event: SSEEvent) => void,
    ) => Promise<void>;
}

export const createAgent = (deps: AgentDeps): Agent => {
    const { model, bq, usage, config, systemPrompt, toolSpecs, dispatchTool } =
        deps;

    const run = async (
        userId: string,
        history: ChatMessage[],
        emit: (event: SSEEvent) => void,
    ): Promise<void> => {
        logger.info("agent.request.start", {
            userId,
            messageCount: history.length,
            model: config.model,
        });

        const messages: ModelMessage[] = history.map((m) =>
            m.role === "assistant"
                ? { role: "assistant", content: m.content, toolCalls: [] }
                : { role: "user", content: m.content },
        );
        const ctx: ToolContext = { emit, bq, chartRenders: 0 };

        for (let turn = 0; turn < config.maxTurns; turn++) {
            const assistant = await model.runTurn(
                { system: systemPrompt, messages, tools: toolSpecs },
                (delta) => emit({ type: "assistant_delta", text: delta }),
            );
            await usage.recordModelUsage(config.model, assistant.usage);

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

            if (await usage.isOverBudget()) {
                logger.warn("agent.budget.exhausted", { userId, turn });
                emit({
                    type: "error",
                    message:
                        "Daily budget reached while answering. Stopping here to protect the budget.",
                });
                break;
            }

            const results: ToolResult[] = [];
            for (const tc of assistant.toolCalls) {
                emit({
                    type: "tool_call",
                    id: tc.id,
                    name: tc.name,
                    input: tc.input,
                });
                const outcome = await dispatchTool(tc.name, tc.input, ctx);
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
        logger.info("agent.request.complete", { userId });
    };

    return { run };
};
