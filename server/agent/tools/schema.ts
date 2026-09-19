import type { AgentTool } from "./types";
import { getTableInfo, internalQuery, DATASET } from "../../bq/client";

let cached: string | null = null;

const buildSchema = async (): Promise<string> => {
    if (cached) return cached;
    const info = await getTableInfo();
    const { rows } = await internalQuery(
        `SELECT field_path, data_type
     FROM \`${DATASET}.INFORMATION_SCHEMA.COLUMN_FIELD_PATHS\`
     WHERE table_name = @t
     ORDER BY field_path`,
        { t: info.latest },
    );
    const fields = rows
        .map((r) => `  ${String(r.field_path)}: ${String(r.data_type)}`)
        .join("\n");
    cached =
        `GA4 export dataset: ${DATASET}\n` +
        `Daily tables: events_YYYYMMDD (wildcard: \`bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*\`)\n` +
        `Available date range: ${info.earliestSuffix} to ${info.latestSuffix}\n` +
        `ALWAYS filter _TABLE_SUFFIX BETWEEN '<start>' AND '<end>' to control cost.\n\n` +
        `For item quantity, use items.quantity after UNNEST(items); item_quantity is not a valid field.\n\n` +
        `Nested field paths (from ${info.latest}):\n${fields}`;
    return cached;
};

export const getSchemaTool: AgentTool = {
    definition: {
        name: "get_schema",
        description:
            "Return the GA4 BigQuery table schema (including nested/repeated field paths) and the available date range. Call this before writing SQL if you are unsure of column names or the nested structure.",
        parameters: { type: "object", properties: {}, required: [] },
    },
    async execute() {
        return { content: await buildSchema() };
    },
};
