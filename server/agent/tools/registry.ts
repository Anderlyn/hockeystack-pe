import type { ToolSpec } from "../model";
import type { AgentTool, ToolContext, ToolExecResult } from "./types";
import { AppError, UnknownToolError, errorMessage } from "../../exceptions";
import { getSchemaTool } from "./schema";
import { profileTool } from "./profile";
import { runSqlTool } from "./sql";
import { renderChartTool } from "./chart";

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
    if (!tool)
        return { content: new UnknownToolError(name).message, is_error: true };
    try {
        return await tool.execute(input, ctx);
    } catch (err) {
        if (err instanceof AppError)
            return { content: err.message, is_error: true };
        console.error(`[tool:${name}] unexpected error:`, err);
        return {
            content: `Unexpected error running ${name}: ${errorMessage(err)}`,
            is_error: true,
        };
    }
};
