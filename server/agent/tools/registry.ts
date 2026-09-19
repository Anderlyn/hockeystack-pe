import type { ToolSpec } from "../model";
import type { AgentTool, ToolContext, ToolExecResult } from "./types";
import { AppError, UnknownToolError, errorMessage } from "../../exceptions";
import { getSchemaTool } from "./schema";
import { profileTool } from "./profile";
import { runSqlTool } from "./sql";
import { renderChartTool } from "./chart";
import { logger } from "../../logger";

const tools: AgentTool[] = [
    getSchemaTool,
    profileTool,
    runSqlTool,
    renderChartTool,
];

export const toolSpecs: ToolSpec[] = tools.map((t) => t.definition);

const byName = new Map<string, AgentTool>(
    tools.map((t) => [t.definition.name, t]),
);

export const dispatchTool = async (
    name: string,
    input: unknown,
    ctx: ToolContext,
): Promise<ToolExecResult> => {
    const tool = byName.get(name);
    if (!tool) {
        logger.warn("agent.tool.unknown", { name });
        return { content: new UnknownToolError(name).message, is_error: true };
    }
    const startedAt = performance.now();
    logger.info("agent.tool.start", { name });
    try {
        const result = await tool.execute(input, ctx);
        logger.info("agent.tool.complete", {
            name,
            ok: !result.is_error,
            durationMs: Math.round(performance.now() - startedAt),
        });
        return result;
    } catch (err) {
        if (err instanceof AppError) {
            logger.warn("agent.tool.failure", {
                name,
                code: err.code,
                message: err.message,
                durationMs: Math.round(performance.now() - startedAt),
            });
            return { content: err.message, is_error: true };
        }
        logger.error("agent.tool.unexpected_error", {
            name,
            error: err,
            durationMs: Math.round(performance.now() - startedAt),
        });
        return {
            content: `Unexpected error running ${name}: ${errorMessage(err)}`,
            is_error: true,
        };
    }
};
