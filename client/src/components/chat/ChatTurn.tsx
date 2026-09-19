import { memo, useMemo } from "react";
import { AnimatedText } from "../AnimatedText";
import { type ChatTurn as ChatTurnData } from "../../hooks/useChat";
import type { ChartSpec, SSEEvent } from "../../../../shared/events";
import {
    DataTable,
    D3BarChart,
    D3GroupedBarChart,
    D3LineChart,
    type BarDatum,
    type GroupedBarDatum,
} from "../../../../shared/visualizations";

const STYLES: Record<string, React.CSSProperties> = {
    turn: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        maxWidth: "860px",
        margin: "0 auto 1.5rem",
    },
    message: {
        position: "relative",
        padding: "1rem 1.2rem",
        borderRadius: "16px",
    },
    messageText: {
        margin: 0,
        lineHeight: 1.65,
    },
    label: {
        display: "block",
        marginBottom: "0.45rem",
        fontSize: "0.72rem",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
    },
    userMessage: {
        width: "fit-content",
        maxWidth: "78%",
        margin: "0 0 0 auto",
        color: "#fff",
        background: "#315efb",
        borderBottomRightRadius: "4px",
    },
    assistantMessage: {
        marginRight: "auto",
        color: "#2b3852",
        background: "#f1f4fa",
        borderBottomLeftRadius: "4px",
    },
    assistantLabel: {
        color: "#315efb",
    },
    error: {
        margin: 0,
        color: "#b42318",
    },
    progressText: {
        color: "#68738a",
        fontSize: "0.85rem",
    },
    stepper: {
        display: "grid",
        gap: "0.45rem",
        margin: "1rem 0 0.1rem",
        padding: 0,
        color: "#68738a",
        fontSize: "0.8rem",
        listStyle: "none",
    },
    step: {
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
    },
    stepIcon: {
        display: "grid",
        width: "1.2rem",
        height: "1.2rem",
        placeItems: "center",
        border: "2px solid #b8c1d2",
        borderRadius: "50%",
        color: "#fff",
        fontSize: "0.7rem",
        fontWeight: 800,
    },
    chartMessage: {
        marginRight: "auto",
        color: "#2b3852",
        background: "#f1f4fa",
        borderBottomLeftRadius: "4px",
    },
    chart: {
        padding: "1rem",
        overflowX: "auto",
        border: "1px solid #e3e7f0",
        borderRadius: "12px",
        background: "#fbfcff",
    },
    chartTitle: {
        margin: "0 0 1rem",
    },
};

const chartData = (
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

const groupedChartData = (
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

const sanitizeAssistantText = (text: string): string =>
    text
        .replace(
            /(?:Rendered|Created|Built)\s+(?:a|an)\s+\w+(?:\s+\w+)*\s+chart\b[^.!?\n]*(?:from\s+)?res_[\w-]+\.?/gi,
            "",
        )
        .replace(/\s*\(x=[^)\n]+,\s*y=[^)\n]+\)/gi, "")
        .replace(
            /(?:result_id|bytes_scanned|columns|total_rows)\s*:\s*[^\n]*/gi,
            "",
        )
        .replace(/\bres_[\w-]+\b/gi, "")
        .replace(/\s+\./g, ".")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

const visualText = (text: string, hasVisual: boolean): string => {
    const sanitized = sanitizeAssistantText(text);
    if (
        !hasVisual &&
        !sanitized.includes("|") &&
        !/(?:here(?:'s| is)|this is)\s+(?:the\s+)?(?:table|chart)\b/i.test(
            sanitized,
        )
    ) {
        return sanitized;
    }
    return sanitized
        .split(/\n+/)
        .filter((line) => {
            const normalized = line.trim().toLowerCase();
            return (
                !line.includes("|") &&
                !/(?:here(?:'s| is)|this is)\s+(?:the\s+)?(?:table|chart)\b/.test(
                    normalized,
                )
            );
        })
        .join("\n")
        .trim();
};

const mergeText = (segments: string[]): string => {
    const merged: string[] = [];
    for (const segment of segments) {
        const value = segment.trim();
        if (!value) continue;
        const previous = merged[merged.length - 1];
        if (!previous || previous === value || previous.includes(value)) {
            if (!previous) merged.push(value);
            continue;
        }
        if (value.includes(previous)) {
            merged[merged.length - 1] = value;
            continue;
        }
        merged.push(value);
    }
    return merged.join("\n\n");
};

const assistantSegments = (events: SSEEvent[]): string[] => {
    const segments: string[] = [];
    let current = "";
    for (const event of events) {
        if (event.type === "assistant_delta") {
            current += event.text;
        } else if (current) {
            segments.push(current);
            current = "";
        }
    }
    if (current) segments.push(current);
    return segments;
};

const toolLabels: Record<string, string> = {
    get_schema: "Understanding your data",
    profile: "Inspecting your data",
    run_sql: "Querying your data",
    render_chart: "Building your chart",
};

type ToolStep = {
    id: string;
    name: string;
    status: "active" | "complete" | "error";
};

const toolSteps = (events: SSEEvent[]): ToolStep[] => {
    const steps: ToolStep[] = [];
    for (const event of events) {
        if (event.type === "tool_call") {
            steps.push({ id: event.id, name: event.name, status: "active" });
        }
        if (event.type === "tool_result") {
            const step = steps.find((item) => item.id === event.id);
            if (step) step.status = event.ok ? "complete" : "error";
        }
    }
    return steps;
};

const ChartMessage = memo(
    ({
        event,
        result,
    }: {
        event: Extract<SSEEvent, { type: "chart" }>;
        result: Extract<SSEEvent, { type: "sql_result" }>;
    }): React.JSX.Element => {
        const barData = useMemo(
            () => chartData(result, event.spec),
            [event, result],
        );
        const groupedData = useMemo(
            () => groupedChartData(result, event.spec),
            [event, result],
        );
        let chart: React.JSX.Element;
        switch (event.spec.type) {
            case "line":
                chart = <D3LineChart data={barData} />;
                break;
            case "grouped_bar":
                chart = (
                    <D3GroupedBarChart
                        data={groupedData}
                        series={event.spec.y}
                    />
                );
                break;
            case "table":
                chart = (
                    <DataTable columns={result.columns} rows={result.rows} />
                );
                break;
            case "bar":
                chart = <D3BarChart data={barData} />;
                break;
        }
        return (
            <div style={{ ...STYLES.message, ...STYLES.chartMessage }}>
                <div style={STYLES.chart}>
                    {event.spec.title && (
                        <h3 style={STYLES.chartTitle}>{event.spec.title}</h3>
                    )}
                    {chart}
                </div>
            </div>
        );
    },
);

export const ChatTurn = memo(
    ({ turn }: { turn: ChatTurnData }): React.JSX.Element => {
        const messages: React.JSX.Element[] = [];
        const charts = turn.events.filter(
            (event): event is Extract<SSEEvent, { type: "chart" }> =>
                event.type === "chart",
        );
        const isComplete = turn.events.some((event) => event.type === "done");
        const displayText = visualText(
            mergeText(assistantSegments(turn.events)),
            charts.length > 0,
        );
        if (displayText) {
            messages.push(
                <div
                    style={{ ...STYLES.message, ...STYLES.assistantMessage }}
                    key="assistant-text"
                >
                    <AnimatedText text={displayText} />
                </div>,
            );
        }
        turn.events.forEach((event, index) => {
            if (event.type === "error") {
                messages.push(
                    <div
                        style={{
                            ...STYLES.message,
                            ...STYLES.assistantMessage,
                        }}
                        key={`error-${index}`}
                    >
                        <p style={STYLES.error} role="alert">
                            {event.message}
                        </p>
                    </div>,
                );
            }
        });
        charts.forEach((chart, index) => {
            const result = turn.events.find(
                (event): event is Extract<SSEEvent, { type: "sql_result" }> =>
                    event.type === "sql_result" &&
                    event.result_id === chart.spec.result_id,
            );
            if (result) {
                messages.push(
                    <ChartMessage
                        key={`chart-${chart.spec.result_id}-${index}`}
                        event={chart}
                        result={result}
                    />,
                );
            }
        });
        const steps = toolSteps(turn.events);
        const shouldShowProgress = steps.length > 0 || !isComplete;
        const progressMessage = shouldShowProgress ? (
            <div
                style={{ ...STYLES.message, ...STYLES.assistantMessage }}
                key="progress"
            >
                <span style={{ ...STYLES.label, ...STYLES.assistantLabel }}>
                    Loki
                </span>
                {steps.length === 0 ? (
                    <span style={STYLES.progressText}>Analyzing...</span>
                ) : (
                    <ol style={STYLES.stepper} aria-label="Analysis progress">
                        {steps.map((step) => (
                            <li
                                key={step.id}
                                style={{
                                    ...STYLES.step,
                                    ...(step.status === "complete"
                                        ? { color: "#43506b" }
                                        : step.status === "error"
                                          ? { color: "#bf3d4b" }
                                          : {}),
                                }}
                            >
                                <span
                                    style={{
                                        ...STYLES.stepIcon,
                                        ...(step.status === "active"
                                            ? {
                                                  borderColor: "#315efb",
                                                  borderTopColor: "transparent",
                                                  animation:
                                                      "step-spin 700ms linear infinite",
                                              }
                                            : step.status === "complete"
                                              ? {
                                                    borderColor: "#315efb",
                                                    color: "#315efb",
                                                }
                                              : {
                                                    borderColor: "#bf3d4b",
                                                    color: "#bf3d4b",
                                                }),
                                    }}
                                    aria-hidden="true"
                                >
                                    {step.status === "complete"
                                        ? "✓"
                                        : step.status === "error"
                                          ? "!"
                                          : ""}
                                </span>
                                <span>
                                    {toolLabels[step.name] ??
                                        "Working on your request"}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        ) : null;
        return (
            <article style={STYLES.turn}>
                <div style={{ ...STYLES.message, ...STYLES.userMessage }}>
                    <span style={{ ...STYLES.label, color: "#dbe3ff" }}>
                        You
                    </span>
                    <p style={STYLES.messageText}>{turn.message.content}</p>
                </div>
                {progressMessage}
                {messages}
            </article>
        );
    },
);
