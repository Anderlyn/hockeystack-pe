import type { AgentTool } from "./types";
import type { ChartType } from "../../../shared/events";
import {
    ToolInputError,
    ResultNotFoundError,
    InvalidChartColumnsError,
} from "../../exceptions";

const TYPES: ChartType[] = ["line", "bar", "grouped_bar", "table"];

export const renderChartTool: AgentTool = {
    definition: {
        name: "render_chart",
        description:
            "Render a chart from a previous run_sql result. Reference the result by its result_id; do not retype data. Validates that the x/y columns exist in that result.",
        parameters: {
            type: "object",
            properties: {
                result_id: {
                    type: "string",
                    description: "The result_id returned by run_sql.",
                },
                type: { type: "string", enum: TYPES },
                x: {
                    type: "string",
                    description: "Column for the x-axis (or category).",
                },
                y: {
                    type: "array",
                    items: { type: "string" },
                    description: "One or more numeric columns to plot.",
                },
                title: { type: "string" },
            },
            required: ["result_id", "type", "x", "y"],
        },
    },
    async execute(input, ctx) {
        if (ctx.chartRenders >= 1) {
            return {
                content:
                    "Only one chart may be rendered per request. Use the existing chart instead of rendering another.",
                is_error: true,
            };
        }
        const { result_id, type, x, y, title } = (input ?? {}) as {
            result_id?: string;
            type?: ChartType;
            x?: string;
            y?: string[];
            title?: string;
        };
        if (!result_id || !type || !x || !Array.isArray(y) || y.length === 0) {
            throw new ToolInputError(
                "render_chart requires result_id, type, x, and a non-empty y[] array.",
            );
        }

        const cached = ctx.bq.getResult(result_id);
        if (!cached) throw new ResultNotFoundError(result_id);

        const missing = [x, ...y].filter((c) => !cached.columns.includes(c));
        if (missing.length > 0) {
            throw new InvalidChartColumnsError(
                result_id,
                missing,
                cached.columns,
            );
        }

        ctx.emit({ type: "chart", spec: { result_id, type, x, y, title } });
        ctx.chartRenders += 1;
        return {
            content: "The visualization is ready.",
        };
    },
};
