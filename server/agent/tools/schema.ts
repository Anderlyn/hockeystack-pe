import type { AgentTool } from "./types";

export const getSchemaTool: AgentTool = {
    definition: {
        name: "get_schema",
        description:
            "Return the GA4 BigQuery table schema (including nested/repeated field paths) and the available date range. Call this before writing SQL if you are unsure of column names or the nested structure.",
        parameters: { type: "object", properties: {}, required: [] },
    },
    async execute(_input, ctx) {
        return { content: await ctx.bq.getSchema() };
    },
};
