import type { AgentTool } from "./types";
import { runSql } from "../../bq/client";
import { ToolInputError } from "../../exceptions";

export const runSqlTool: AgentTool = {
    definition: {
        name: "run_sql",
        description:
            "Run a read-only BigQuery Standard SQL query against the GA4 dataset. Returns a 20-row sample plus a result_id; the full result set is streamed to the user's screen. Always use backticks around the fully qualified events_* wildcard and filter _TABLE_SUFFIX to control cost.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "A single read-only SELECT/WITH query.",
                },
            },
            required: ["query"],
        },
    },
    async execute(input, ctx) {
        const query = (input as { query?: string })?.query;
        if (!query || typeof query !== "string") {
            throw new ToolInputError(
                "run_sql requires a non-empty 'query' string.",
            );
        }

        const result = await runSql(query);

        ctx.emit({
            type: "sql_result",
            result_id: result.result_id,
            columns: result.columns,
            rows: result.rows,
            total_rows: result.total_rows,
            bytes_processed: result.bytes_processed,
        });

        const sample = result.rows.slice(0, 20);
        const summary =
            `result_id: ${result.result_id}\n` +
            `columns: ${result.columns.join(", ")}\n` +
            `total_rows: ${result.total_rows} (sample of up to 20 below)\n` +
            `bytes_scanned: ${result.bytes_processed}\n\n` +
            JSON.stringify(sample, null, 2);
        return { content: summary };
    },
};
