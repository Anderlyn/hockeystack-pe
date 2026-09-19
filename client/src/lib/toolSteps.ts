import type { SSEEvent } from "../../../shared/events";

export const toolLabels: Record<string, string> = {
    get_schema: "Understanding your data",
    profile: "Inspecting your data",
    run_sql: "Querying your data",
    render_chart: "Building your chart",
};

export interface ToolStep {
    id: string;
    name: string;
    status: "active" | "complete" | "error";
}

export const toolSteps = (events: SSEEvent[]): ToolStep[] => {
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
