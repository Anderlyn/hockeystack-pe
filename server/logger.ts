import { config } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

const priorities: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const configuredLevel = (value: string): LogLevel =>
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
        ? value
        : "info";

const level = configuredLevel(config.logLevel);

const serialize = (value: unknown): unknown => {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }
    return value;
};

const write = (
    severity: LogLevel,
    event: string,
    fields: Record<string, unknown> = {},
): void => {
    if (priorities[severity] < priorities[level]) return;
    const payload = {
        timestamp: new Date().toISOString(),
        level: severity,
        event,
        ...Object.fromEntries(
            Object.entries(fields).map(([key, value]) => [
                key,
                serialize(value),
            ]),
        ),
    };
    const output = JSON.stringify(payload);
    if (severity === "error") console.error(output);
    else if (severity === "warn") console.warn(output);
    else console.log(output);
};

export const logger = {
    debug: (event: string, fields?: Record<string, unknown>): void =>
        write("debug", event, fields),
    info: (event: string, fields?: Record<string, unknown>): void =>
        write("info", event, fields),
    warn: (event: string, fields?: Record<string, unknown>): void =>
        write("warn", event, fields),
    error: (event: string, fields?: Record<string, unknown>): void =>
        write("error", event, fields),
};
