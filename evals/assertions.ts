import type { GoldenCase } from "./golden";
import { validateReadOnlyQuery } from "../server/bq/query-policy";

export interface EvalTrace {
    tools: string[];
    sql?: string;
    response?: string;
}

export interface EvalFailure {
    caseId: string;
    assertion: string;
}

const contains = (value: string, patterns: RegExp[]): RegExp | undefined =>
    patterns.find((pattern) => pattern.test(value));

export const evaluateCase = (
    testCase: GoldenCase,
    trace: EvalTrace,
): EvalFailure[] => {
    const failures: EvalFailure[] = [];
    const actual = trace.tools.join(",");
    const expectedSequences = testCase.expectedToolSequences ?? [
        testCase.expectedTools,
    ];
    const matchesExpected = expectedSequences.some(
        (sequence) => sequence.join(",") === actual,
    );
    if (!matchesExpected) {
        failures.push({
            caseId: testCase.id,
            assertion: `expected tool sequence(s) ${expectedSequences
                .map((sequence) => `[${sequence.join(",")}]`)
                .join(" or ")}, received [${actual}]`,
        });
    }
    const forbiddenTool = testCase.forbiddenTools?.find((tool) =>
        trace.tools.includes(tool),
    );
    if (forbiddenTool) {
        failures.push({
            caseId: testCase.id,
            assertion: `forbidden tool was called: ${forbiddenTool}`,
        });
    }
    if (trace.sql) {
        try {
            validateReadOnlyQuery(trace.sql);
        } catch (error) {
            failures.push({
                caseId: testCase.id,
                assertion:
                    error instanceof Error
                        ? error.message
                        : "SQL failed read-only validation",
            });
        }
        const missing = (testCase.requiredSqlPatterns ?? []).find(
            (pattern) => !pattern.test(trace.sql ?? ""),
        );
        if (missing) {
            failures.push({
                caseId: testCase.id,
                assertion: `required SQL pattern missing: ${missing}`,
            });
        }
        const forbidden = contains(
            trace.sql,
            testCase.forbiddenSqlPatterns ?? [],
        );
        if (forbidden) {
            failures.push({
                caseId: testCase.id,
                assertion: `forbidden SQL pattern found: ${forbidden}`,
            });
        }
    }
    if (trace.response) {
        const forbidden = contains(
            trace.response,
            testCase.responseMustNotContain ?? [],
        );
        if (forbidden) {
            failures.push({
                caseId: testCase.id,
                assertion: `forbidden response pattern found: ${forbidden}`,
            });
        }
    }
    return failures;
};
