import type { BigQuery } from "@google-cloud/bigquery";
import { randomUUID } from "node:crypto";
import type { Row, Primitive } from "../../shared/events";
import type { Config } from "../config";
import {
    AppError,
    QueryCostLimitError,
    BigQueryExecutionError,
    errorMessage,
} from "../exceptions";
import { logger } from "../logger";
import { validateReadOnlyQuery } from "./query-policy";
import { DATASET } from "./dataset";
import type { CachedResult, ResultStore } from "./result-store";

export interface QueryResult {
    result_id: string;
    columns: string[];
    rows: Row[];
    total_rows: number;
    bytes_processed: number;
}

export interface TableInfo {
    earliest: string;
    latest: string;
    earliestSuffix: string;
    latestSuffix: string;
}

export interface BigQueryService {
    runSql: (query: string) => Promise<QueryResult>;
    internalQuery: (
        query: string,
        params?: Record<string, unknown>,
    ) => Promise<CachedResult>;
    getResult: (id: string) => CachedResult | undefined;
    getTableInfo: () => Promise<TableInfo>;
    getSchema: () => Promise<string>;
}

export interface BigQueryServiceDeps {
    bq: BigQuery;
    config: Config;
    results: ResultStore;
}

const normalize = (value: unknown): Primitive => {
    if (value === null || value === undefined) return null;
    if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "string"
    ) {
        return value;
    }
    if (
        typeof value === "object" &&
        "value" in (value as Record<string, unknown>)
    ) {
        return String((value as { value: unknown }).value);
    }
    return String(value);
};

const normalizeRows = (rows: Record<string, unknown>[]): Row[] =>
    rows.map((r) => {
        const out: Row = {};
        for (const k of Object.keys(r)) out[k] = normalize(r[k]);
        return out;
    });

const columnsFrom = (
    apiResponse:
        { schema?: { fields?: { name?: string | null }[] } } | undefined,
    rows: Record<string, unknown>[],
): string[] => {
    const fromSchema = (apiResponse?.schema?.fields ?? [])
        .map((f) => f.name ?? "")
        .filter((n) => n.length > 0);
    if (fromSchema.length > 0) return fromSchema;
    return rows.length > 0 ? Object.keys(rows[0]) : [];
};

export const createBigQueryService = (
    deps: BigQueryServiceDeps,
): BigQueryService => {
    const { bq, config, results } = deps;
    let tableInfo: TableInfo | null = null;
    let schema: string | null = null;

    const runBq = async <T>(
        query: string,
        op: () => Promise<T>,
    ): Promise<T> => {
        try {
            return await op();
        } catch (err) {
            if (err instanceof AppError) {
                logger.warn("bigquery.operation.failure", {
                    code: err.code,
                    message: err.message,
                    query,
                });
                throw err;
            }
            logger.error("bigquery.operation.error", { error: err, query });
            throw new BigQueryExecutionError(errorMessage(err), query, err);
        }
    };

    const dryRunBytes = async (query: string): Promise<number> =>
        runBq(query, async () => {
            const startedAt = performance.now();
            logger.debug("bigquery.dry_run.start", { query });
            const [job] = await bq.createQueryJob({
                query,
                dryRun: true,
                location: config.bqLocation,
            });
            const total = job.metadata?.statistics?.totalBytesProcessed;
            const bytes = total ? Number(total) : 0;
            logger.info("bigquery.dry_run.complete", {
                bytesProcessed: bytes,
                durationMs: Math.round(performance.now() - startedAt),
            });
            return bytes;
        });

    const internalQuery = async (
        query: string,
        params?: Record<string, unknown>,
    ): Promise<CachedResult> =>
        runBq(query, async () => {
            const startedAt = performance.now();
            logger.debug("bigquery.internal_query.start", { query });
            const [job] = await bq.createQueryJob({
                query,
                params,
                location: config.bqLocation,
                maximumBytesBilled: String(config.maxBytesBilled),
            });
            const [rows, , apiResponse] = await job.getQueryResults();
            const typedRows = rows as Record<string, unknown>[];
            const result = {
                columns: columnsFrom(apiResponse, typedRows),
                rows: normalizeRows(typedRows),
            };
            logger.info("bigquery.internal_query.complete", {
                rowCount: result.rows.length,
                columnCount: result.columns.length,
                durationMs: Math.round(performance.now() - startedAt),
            });
            return result;
        });

    const runSql = async (query: string): Promise<QueryResult> => {
        const startedAt = performance.now();
        logger.info("bigquery.query.start", {
            query,
            queryLength: query.length,
        });
        validateReadOnlyQuery(query);

        const bytes = await dryRunBytes(query);
        if (bytes > config.maxBytesBilled) {
            logger.warn("bigquery.query.cost_limit", {
                bytesProcessed: bytes,
                maxBytesBilled: config.maxBytesBilled,
                durationMs: Math.round(performance.now() - startedAt),
            });
            throw new QueryCostLimitError(bytes, config.maxBytesBilled);
        }

        const { columns, rows } = await runBq(query, async () => {
            const [job] = await bq.createQueryJob({
                query,
                location: config.bqLocation,
                maximumBytesBilled: String(config.maxBytesBilled),
            });
            const [resultRows, , apiResponse] = await job.getQueryResults();
            const typedRows = resultRows as Record<string, unknown>[];
            return {
                columns: columnsFrom(apiResponse, typedRows),
                rows: normalizeRows(typedRows),
            };
        });

        const result_id = `res_${randomUUID().slice(0, 8)}`;
        results.set(result_id, { columns, rows });
        logger.info("bigquery.query.complete", {
            resultId: result_id,
            rowCount: rows.length,
            columnCount: columns.length,
            bytesProcessed: bytes,
            durationMs: Math.round(performance.now() - startedAt),
        });
        return {
            result_id,
            columns,
            rows,
            total_rows: rows.length,
            bytes_processed: bytes,
        };
    };

    const getTableInfo = async (): Promise<TableInfo> => {
        if (tableInfo) return tableInfo;
        const { rows } = await internalQuery(
            `SELECT MIN(table_id) AS earliest, MAX(table_id) AS latest
             FROM \`${DATASET}.__TABLES__\`
             WHERE STARTS_WITH(table_id, 'events_')`,
        );
        const earliest = String(rows[0]?.earliest ?? "events_20201101");
        const latest = String(rows[0]?.latest ?? "events_20210131");
        tableInfo = {
            earliest,
            latest,
            earliestSuffix: earliest.replace("events_", ""),
            latestSuffix: latest.replace("events_", ""),
        };
        return tableInfo;
    };

    const getSchema = async (): Promise<string> => {
        if (schema) return schema;
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
        schema =
            `GA4 export dataset: ${DATASET}\n` +
            `Daily tables: events_YYYYMMDD (wildcard: \`bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*\`)\n` +
            `Available date range: ${info.earliestSuffix} to ${info.latestSuffix}\n` +
            `ALWAYS filter _TABLE_SUFFIX BETWEEN '<start>' AND '<end>' to control cost.\n\n` +
            `For item quantity, use items.quantity after UNNEST(items); item_quantity is not a valid field.\n\n` +
            `Nested field paths (from ${info.latest}):\n${fields}`;
        return schema;
    };

    return {
        runSql,
        internalQuery,
        getResult: (id) => results.get(id),
        getTableInfo,
        getSchema,
    };
};
