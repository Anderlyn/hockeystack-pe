import { AppError } from "./base";

// An SQL query was rejected by the read-only guard.
export class ReadOnlyQueryError extends AppError {
    readonly code = "READ_ONLY_VIOLATION";
    constructor(reason: string) {
        super(`Read-only guard rejected the query: ${reason}`, {
            recoverable: true,
            details: { reason },
        });
    }
}

// One of the query to be executed would exceed the configured cost limit. The model can read this and rewrite.
export class QueryCostLimitError extends AppError {
    readonly code = "QUERY_COST_LIMIT";
    constructor(bytes: number, capBytes: number) {
        const gb = (bytes / 1e9).toFixed(2);
        const capGb = (capBytes / 1e9).toFixed(2);
        super(
            `Query would scan ~${gb} GB, over the ${capGb} GB cap. ` +
                `Add a _TABLE_SUFFIX date filter (e.g. BETWEEN '20210101' AND '20210131') ` +
                `or select fewer columns, then retry.`,
            { recoverable: true, details: { bytes, capBytes } },
        );
    }
}

// Big query failed to execute. This is usually a syntax error or other query issue that the model can read and self-correct.
export class BigQueryExecutionError extends AppError {
    readonly code = "BIGQUERY_EXECUTION_ERROR";
    constructor(bigQueryMessage: string, query: string, cause?: unknown) {
        super(`BigQuery rejected the query: ${bigQueryMessage}`, {
            recoverable: true,
            cause,
            details: { query },
        });
    }
}
