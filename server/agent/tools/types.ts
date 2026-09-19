import type { SSEEvent } from "../../../shared/events";
import type { ToolSpec } from "../model";
import type { BigQueryService } from "../../bq/service";

export interface ToolContext {
    emit: (event: SSEEvent) => void;
    bq: BigQueryService;
    chartRenders: number;
}

export interface ToolExecResult {
    content: string;
    is_error?: boolean;
}

export interface AgentTool {
    definition: ToolSpec;
    execute: (input: unknown, ctx: ToolContext) => Promise<ToolExecResult>;
}
