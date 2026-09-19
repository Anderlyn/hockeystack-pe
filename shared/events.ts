// Wire contract shared by server (emits) and client (renders).
// Kept dependency-free so both sides can import it directly.

export type Primitive = string | number | boolean | null;
export type Row = Record<string, Primitive>;

export type ChartType = "line" | "bar" | "grouped_bar" | "table";

export interface ChartSpec {
    result_id: string;
    type: ChartType;
    x: string;
    y: string[];
    title?: string;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface DailyUsage {
    day: string;
    used: number;
    remaining: number;
    limit: number;
}

/**
 * These events are streamed to the client so the client knows what to render after each step.
 */
export type SSEEvent =
    | { type: "assistant_delta"; text: string }
    | { type: "tool_call"; id: string; name: string; input: unknown }
    | {
          type: "tool_result";
          id: string;
          name: string;
          ok: boolean;
          summary: string;
      }
    | {
          type: "sql_result";
          result_id: string;
          columns: string[];
          rows: Row[];
          total_rows: number;
          bytes_processed: number;
      }
    | { type: "chart"; spec: ChartSpec }
    | { type: "usage"; usage: DailyUsage }
    | { type: "error"; message: string }
    | { type: "done" };
