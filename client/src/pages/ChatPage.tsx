import {
    FormEvent,
    memo,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useAuth } from "../auth/AuthContext";
import { AnimatedText } from "../components/AnimatedText";
import { useChat, type ChatTurn } from "../hooks/useChat";
import type { ChartSpec, SSEEvent } from "../../../shared/events";
import {
    DataTable,
    D3BarChart,
    D3GroupedBarChart,
    D3LineChart,
    type BarDatum,
    type GroupedBarDatum,
} from "../../../shared/visualizations";

const STYLES = {
    page: {
        width: "min(1180px, 100%)",
        minHeight: "100vh",
        margin: "0 auto",
        padding: "2rem clamp(1rem, 4vw, 3rem)",
    } satisfies React.CSSProperties,
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid #e3e7f0",
    } satisfies React.CSSProperties,
    eyebrow: {
        margin: "0 0 0.25rem",
        color: "#315efb",
        fontSize: "0.75rem",
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
    } satisfies React.CSSProperties,
    heading: {
        margin: 0,
        letterSpacing: "-0.04em",
    } satisfies React.CSSProperties,
    actions: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    } satisfies React.CSSProperties,
    muted: {
        color: "#68738a",
    } satisfies React.CSSProperties,
    userName: {
        maxWidth: "180px",
        overflow: "hidden",
        color: "#68738a",
        fontSize: "0.85rem",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    } satisfies React.CSSProperties,
    usage: {
        color: "#68738a",
        fontSize: "0.8rem",
    } satisfies React.CSSProperties,
    secondaryButton: {
        padding: "0.55rem 0.8rem",
        border: 0,
        borderRadius: "10px",
        color: "#43506b",
        background: "#edf0f6",
        fontWeight: 700,
    } satisfies React.CSSProperties,
    box: {
        display: "flex",
        minHeight: "calc(100vh - 160px)",
        marginTop: "1.5rem",
        padding: "0.75rem",
        flexDirection: "column",
        border: "1px solid #dce2ee",
        borderRadius: "20px",
        background: "rgb(255 255 255 / 78%)",
    } satisfies React.CSSProperties,
    stream: {
        minHeight: 0,
        flex: 1,
        padding: "clamp(1rem, 3vw, 2.5rem)",
        overflowY: "auto",
    } satisfies React.CSSProperties,
    turn: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        maxWidth: "860px",
        margin: "0 auto 1.5rem",
    } satisfies React.CSSProperties,
    message: {
        position: "relative",
        padding: "1rem 1.2rem",
        borderRadius: "16px",
    } satisfies React.CSSProperties,
    messageText: {
        margin: 0,
        lineHeight: 1.65,
    } satisfies React.CSSProperties,
    label: {
        display: "block",
        marginBottom: "0.45rem",
        fontSize: "0.72rem",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
    } satisfies React.CSSProperties,
    userMessage: {
        width: "fit-content",
        maxWidth: "78%",
        margin: "0 0 0 auto",
        color: "#fff",
        background: "#315efb",
        borderBottomRightRadius: "4px",
    } satisfies React.CSSProperties,
    assistantMessage: {
        marginRight: "auto",
        color: "#2b3852",
        background: "#f1f4fa",
        borderBottomLeftRadius: "4px",
    } satisfies React.CSSProperties,
    assistantLabel: {
        color: "#315efb",
    } satisfies React.CSSProperties,
    error: {
        margin: 0,
        color: "#b42318",
    } satisfies React.CSSProperties,
    progressText: {
        color: "#68738a",
        fontSize: "0.85rem",
    } satisfies React.CSSProperties,
    stepper: {
        display: "grid",
        gap: "0.45rem",
        margin: "1rem 0 0.1rem",
        padding: 0,
        color: "#68738a",
        fontSize: "0.8rem",
        listStyle: "none",
    } satisfies React.CSSProperties,
    step: {
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
    } satisfies React.CSSProperties,
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
    } satisfies React.CSSProperties,
    chartMessage: {
        marginRight: "auto",
        color: "#2b3852",
        background: "#f1f4fa",
        borderBottomLeftRadius: "4px",
    } satisfies React.CSSProperties,
    chart: {
        padding: "1rem",
        overflowX: "auto",
        border: "1px solid #e3e7f0",
        borderRadius: "12px",
        background: "#fbfcff",
    } satisfies React.CSSProperties,
    chartTitle: {
        margin: "0 0 1rem",
    } satisfies React.CSSProperties,
    empty: {
        display: "grid",
        maxWidth: "460px",
        margin: "auto",
        placeItems: "center",
        textAlign: "center",
    } satisfies React.CSSProperties,
    emptyHeading: {
        margin: 0,
        fontSize: "clamp(1.4rem, 3vw, 2rem)",
        letterSpacing: "-0.03em",
    } satisfies React.CSSProperties,
    emptyText: {
        margin: "0.75rem 0 0",
        color: "#68738a",
        lineHeight: 1.6,
    } satisfies React.CSSProperties,
    composer: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        margin: "0.75rem 0 0",
        padding: "0.5rem",
        border: "1px solid #dce2ee",
        borderRadius: "14px",
        background: "rgb(255 255 255 / 92%)",
    } satisfies React.CSSProperties,
    input: {
        flex: 1,
        minWidth: 0,
        padding: "0.8rem",
        border: 0,
        outline: 0,
        background: "transparent",
    } satisfies React.CSSProperties,
    sendButton: {
        padding: "0.75rem 1.1rem",
        border: 0,
        borderRadius: "10px",
        color: "#fff",
        background: "#315efb",
        fontWeight: 700,
    } satisfies React.CSSProperties,
} as const;

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

const chartData = (
    event: Extract<SSEEvent, { type: "sql_result" }>,
    spec: ChartSpec,
): BarDatum[] => {
    const [valueColumn] = spec.y;
    const labelColumn = spec.x;
    if (!labelColumn || !valueColumn) {
        return [];
    }
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
        if (label === null || label === undefined) {
            return [];
        }
        const values = Object.fromEntries(
            spec.y.map((column) => [
                column,
                typeof row[column] === "number" ? row[column] : 0,
            ]),
        );
        return [{ label: String(label), values }];
    });

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
            if (step) {
                step.status = event.ok ? "complete" : "error";
            }
        }
    }
    return steps;
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

const StreamedTurn = memo(({ turn }: { turn: ChatTurn }): React.JSX.Element => {
    const messages: React.JSX.Element[] = [];
    const charts = turn.events.filter(
        (event): event is Extract<SSEEvent, { type: "chart" }> =>
            event.type === "chart",
    );
    const hasVisual = charts.length > 0;
    const displayText = visualText(
        mergeText(assistantSegments(turn.events)),
        hasVisual,
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
                    style={{ ...STYLES.message, ...STYLES.assistantMessage }}
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
    const progressMessage = (
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
    );

    return (
        <article style={STYLES.turn}>
            <div style={{ ...STYLES.message, ...STYLES.userMessage }}>
                <span style={{ ...STYLES.label, color: "#dbe3ff" }}>You</span>
                <p style={STYLES.messageText}>{turn.message.content}</p>
            </div>
            {progressMessage}
            {messages}
        </article>
    );
});

export const ChatPage = (): React.JSX.Element => {
    const { signOut, user } = useAuth();
    const { turns, isStreaming, sendMessage, usage } = useChat();
    const [draft, setDraft] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const streamRef = useRef<HTMLElement>(null);

    const scrollToBottom = (): void => {
        const stream = streamRef.current;
        if (stream) {
            stream.scrollTop = stream.scrollHeight;
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
    };

    useLayoutEffect(() => {
        scrollToBottom();
    });

    useLayoutEffect(() => {
        const stream = streamRef.current;
        if (!stream) return;
        const observer = new ResizeObserver(scrollToBottom);
        const mutationObserver = new MutationObserver(scrollToBottom);
        observer.observe(stream);
        mutationObserver.observe(stream, {
            childList: true,
            characterData: true,
            subtree: true,
        });
        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
        };
    }, []);

    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const message = draft;
        setDraft("");
        await sendMessage(message);
    };

    return (
        <main style={STYLES.page}>
            <header style={STYLES.header}>
                <div>
                    <p style={STYLES.eyebrow}>HockeyStack Technical Task</p>
                    <h1 style={STYLES.heading}>
                        Loki: Data Analytics Assistant
                    </h1>
                </div>
                <div style={STYLES.actions}>
                    {usage && (
                        <span style={STYLES.usage}>
                            {usage.remaining} prompt
                            {usage.remaining === 1 ? "" : "s"} left today
                        </span>
                    )}
                    <span style={STYLES.userName}>{user?.displayName}</span>
                    <button
                        style={STYLES.secondaryButton}
                        type="button"
                        onClick={() => {
                            setAuthError(null);
                            void signOut().catch((reason: unknown) => {
                                setAuthError(
                                    reason instanceof Error
                                        ? reason.message
                                        : "Unable to sign out.",
                                );
                            });
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </header>
            <section style={STYLES.box}>
                <section
                    ref={streamRef}
                    aria-live="polite"
                    style={STYLES.stream}
                >
                    {turns.length === 0 && (
                        <div style={STYLES.empty}>
                            <h2 style={STYLES.emptyHeading}>
                                What would you like to know?
                            </h2>
                            <p style={STYLES.emptyText}>
                                Ask Loki to explore your data, find trends, or
                                build a chart.
                            </p>
                        </div>
                    )}
                    {turns.map((turn, index) => (
                        <StreamedTurn
                            key={`${turn.message.content}-${index}`}
                            turn={turn}
                        />
                    ))}
                    {authError && <p role="alert">{authError}</p>}
                </section>
                <form style={STYLES.composer} onSubmit={submit}>
                    <input
                        style={STYLES.input}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Ask about your data"
                        disabled={isStreaming}
                    />
                    <button
                        style={STYLES.sendButton}
                        type="submit"
                        disabled={isStreaming || !draft.trim()}
                    >
                        Send
                    </button>
                </form>
            </section>
        </main>
    );
};
