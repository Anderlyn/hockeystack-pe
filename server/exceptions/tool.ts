import { AppError } from "./base";

// Incorrect input provided to a tool.
export class ToolInputError extends AppError {
    readonly code = "TOOL_INPUT_ERROR";
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, { recoverable: true, details });
    }
}

// Tool doesn't exist within our agent
export class UnknownToolError extends AppError {
    readonly code = "UNKNOWN_TOOL";
    constructor(name: string) {
        super(`Unknown tool "${name}". No tool with that name is registered.`, {
            recoverable: true,
            details: { name },
        });
    }
}

// Result id provided to a tool doesn't exist in our cache
export class ResultNotFoundError extends AppError {
    readonly code = "RESULT_NOT_FOUND";
    constructor(resultId: string) {
        super(
            `No cached result for result_id "${resultId}". Run the query with run_sql first, ` +
                `then call render_chart with the result_id it returns.`,
            { recoverable: true, details: { resultId } },
        );
    }
}

// The tool was called with a result_id that is not a chartable result.
export class InvalidChartColumnsError extends AppError {
    readonly code = "INVALID_CHART_COLUMNS";
    constructor(resultId: string, missing: string[], available: string[]) {
        super(
            `Columns [${missing.join(", ")}] do not exist in result ${resultId}. ` +
                `Available columns: [${available.join(", ")}]. Use only these for x/y.`,
            { recoverable: true, details: { resultId, missing, available } },
        );
    }
}

// Tjhe tool was called with a result_id that is not a chartable result.
export class UnknownDimensionError extends AppError {
    readonly code = "UNKNOWN_DIMENSION";
    constructor(dimension: string, supported: string[]) {
        super(
            `Unknown dimension "${dimension}". Supported dimensions: ${supported.join(", ")}.`,
            {
                recoverable: true,
                details: { dimension, supported },
            },
        );
    }
}
