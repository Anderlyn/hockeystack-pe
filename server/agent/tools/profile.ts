import type { AgentTool } from "./types";
import { getTableInfo, internalQuery, dailyTable } from "../../bq/client";
import { UnknownDimensionError } from "../../exceptions";

// A
const DIMENSIONS: Record<string, (table: string) => string> = {
    event_name: (t) =>
        `SELECT event_name AS value, COUNT(*) AS count FROM ${t} GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    event_params_keys: (t) =>
        `SELECT ep.key AS value, COUNT(*) AS count FROM ${t}, UNNEST(event_params) ep GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    user_properties_keys: (t) =>
        `SELECT up.key AS value, COUNT(*) AS count FROM ${t}, UNNEST(user_properties) up GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    item_category: (t) =>
        `SELECT i.item_category AS value, COUNT(*) AS count FROM ${t}, UNNEST(items) i GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    item_name: (t) =>
        `SELECT i.item_name AS value, COUNT(*) AS count FROM ${t}, UNNEST(items) i GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    device_category: (t) =>
        `SELECT device.category AS value, COUNT(*) AS count FROM ${t} GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    country: (t) =>
        `SELECT geo.country AS value, COUNT(*) AS count FROM ${t} GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    traffic_source: (t) =>
        `SELECT traffic_source.source AS value, COUNT(*) AS count FROM ${t} GROUP BY 1 ORDER BY count DESC LIMIT 100`,
    platform: (t) =>
        `SELECT platform AS value, COUNT(*) AS count FROM ${t} GROUP BY 1 ORDER BY count DESC LIMIT 100`,
};

const SUPPORTED = Object.keys(DIMENSIONS);

export const profileTool: AgentTool = {
    definition: {
        name: "profile",
        description:
            "Discover the actual values present for a dimension before writing a full query — prevents silent zero-row results. Runs against a single recent day. Supported dimensions: " +
            SUPPORTED.join(", ") +
            ".",
        parameters: {
            type: "object",
            properties: {
                dimension: {
                    type: "string",
                    enum: SUPPORTED,
                    description: "The dimension to profile.",
                },
            },
            required: ["dimension"],
        },
    },
    async execute(input) {
        const dim = (input as { dimension?: string })?.dimension;
        if (!dim || !(dim in DIMENSIONS)) {
            throw new UnknownDimensionError(dim ?? "(none)", SUPPORTED);
        }
        const info = await getTableInfo();
        const sql = DIMENSIONS[dim](dailyTable(info.latest));
        const { rows } = await internalQuery(sql);
        const lines = rows
            .map((r) => `${String(r.value)} (${String(r.count)})`)
            .join("\n");
        return {
            content: `Values for "${dim}" on ${info.latestSuffix}:\n${lines}`,
        };
    },
};
