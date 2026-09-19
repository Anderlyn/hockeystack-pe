import { config } from "../server/config";
import { resolveModel } from "../server/agent/models";
import { getModel } from "../server/agent/providers";
import { SYSTEM_PROMPT } from "../server/agent/system-prompt";
import type {
    AssistantTurn,
    ModelMessage,
    ToolResult,
} from "../server/agent/model";
import { toolSpecs } from "../server/agent/tools/registry";
import { evaluateCase, type EvalTrace } from "./assertions";
import { goldenCases } from "./golden";

interface ModelTrace extends EvalTrace {
    response: string;
}

const schemaFixture = JSON.stringify({
    dataset: "analytics ecommerce data",
    fields: ["event_date", "event_name", "ecommerce.purchase_revenue"],
    itemFields: ["item_id", "item_name", "item_brand", "price", "quantity"],
});

const toolFixture = (
    name: string,
    input: Record<string, unknown>,
    trace: ModelTrace,
): ToolResult => {
    if (name === "get_schema") {
        return {
            id: "",
            name,
            content: schemaFixture,
        };
    }
    if (name === "profile") {
        return {
            id: "",
            name,
            content: JSON.stringify({
                values: ["purchase", "page_view", "United States"],
            }),
        };
    }
    if (name === "run_sql") {
        const query = typeof input.query === "string" ? input.query : "";
        trace.sql = query;
        return {
            id: "",
            name,
            content:
                "Query succeeded. result_id: res_eval_001\n" +
                "columns: item_name, total_quantity_sold, event_date, revenue\n" +
                "sample rows are available for visualization.",
        };
    }
    if (name === "render_chart") {
        trace.response += "";
        return {
            id: "",
            name,
            content: "The visualization is ready.",
        };
    }
    return {
        id: "",
        name,
        content: `Unknown evaluation tool: ${name}`,
        isError: true,
    };
};

const runCase = async (
    question: string,
    model: ReturnType<typeof getModel>,
): Promise<ModelTrace> => {
    const trace: ModelTrace = { tools: [], response: "" };
    const messages: ModelMessage[] = [{ role: "user", content: question }];

    for (let turn = 0; turn < config.maxTurns; turn += 1) {
        const assistant: AssistantTurn = await model.runTurn(
            { system: SYSTEM_PROMPT, messages, tools: toolSpecs },
            (delta) => {
                trace.response += delta;
            },
        );
        messages.push({
            role: "assistant",
            content: assistant.text,
            toolCalls: assistant.toolCalls,
        });
        if (
            assistant.stopReason !== "tool_use" ||
            assistant.toolCalls.length === 0
        ) {
            break;
        }
        const results = assistant.toolCalls.map((toolCall) => {
            trace.tools.push(toolCall.name);
            const result = toolFixture(toolCall.name, toolCall.input, trace);
            return {
                ...result,
                id: toolCall.id,
            };
        });
        messages.push({ role: "tool", results });
    }
    return trace;
};

const resolved = resolveModel(config.model);
const model = getModel();
console.log(`Evaluating ${resolved.provider}:${resolved.id}`);
console.log("Tool execution: fixtures only; BigQuery and quota are not used.");

let failureCount = 0;
for (const testCase of goldenCases) {
    const trace = await runCase(testCase.question, model);
    const failures = evaluateCase(testCase, trace);
    failureCount += failures.length;
    console.log(
        `${failures.length === 0 ? "PASS" : "FAIL"} ${testCase.id} ` +
            `(tools=${trace.tools.join(",") || "none"})`,
    );
    for (const failure of failures) {
        console.error(`  ${failure.assertion}`);
    }
}

if (failureCount > 0) process.exitCode = 1;
