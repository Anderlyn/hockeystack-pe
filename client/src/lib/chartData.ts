import type { ChartSpec, SSEEvent } from "../../../shared/events";
import type { BarDatum, GroupedBarDatum } from "../../../shared/visualizations";

export const chartData = (
    event: Extract<SSEEvent, { type: "sql_result" }>,
    spec: ChartSpec,
): BarDatum[] => {
    const [valueColumn] = spec.y;
    const labelColumn = spec.x;
    if (!labelColumn || !valueColumn) return [];
    return event.rows.flatMap((row) => {
        const value = row[valueColumn];
        return typeof value === "number"
            ? [{ label: String(row[labelColumn] ?? ""), value }]
            : [];
    });
};

export const groupedChartData = (
    event: Extract<SSEEvent, { type: "sql_result" }>,
    spec: ChartSpec,
): GroupedBarDatum[] =>
    event.rows.flatMap((row) => {
        const label = row[spec.x];
        if (label === null || label === undefined) return [];
        const values = Object.fromEntries(
            spec.y.map((column) => [
                column,
                typeof row[column] === "number" ? row[column] : 0,
            ]),
        );
        return [{ label: String(label), values }];
    });
