import { ReadOnlyQueryError } from "../exceptions";

export const validateReadOnlyQuery = (sql: string): void => {
    const stripped = sql
        .replace(/--[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();
    const first = stripped.split(/\s+/)[0]?.toUpperCase() ?? "";
    if (first !== "SELECT" && first !== "WITH") {
        throw new ReadOnlyQueryError(
            `it must be a single statement starting with SELECT or WITH (got "${first || "empty query"}").`,
        );
    }
    const dml = stripped.match(
        /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CALL|EXPORT)\b/i,
    );
    if (dml) {
        throw new ReadOnlyQueryError(
            `it contains the disallowed statement keyword "${dml[1].toUpperCase()}". This tool is read-only.`,
        );
    }
};
