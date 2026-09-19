import { evaluateCase, type EvalTrace } from "./assertions";
import { goldenCases } from "./golden";

const traces: Record<string, EvalTrace> = {
    "top-products-by-quantity": {
        tools: ["get_schema", "run_sql", "render_chart"],
        sql: `
            SELECT i.item_name, SUM(i.quantity) AS total_quantity_sold
            FROM \`bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*\` e,
            UNNEST(e.items) AS i
            WHERE _TABLE_SUFFIX BETWEEN '20210101' AND '20210131'
            GROUP BY i.item_name
            ORDER BY total_quantity_sold DESC
            LIMIT 10
        `,
        response: "The chart shows the top products by quantity sold.",
    },
    "revenue-trend": {
        tools: ["get_schema", "run_sql", "render_chart"],
        sql: `
            SELECT event_date, SUM(ecommerce.purchase_revenue) AS revenue
            FROM \`bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*\`
            WHERE event_name = 'purchase'
              AND _TABLE_SUFFIX BETWEEN '20210101' AND '20210131'
            GROUP BY event_date
        `,
    },
    "capability-question": {
        tools: [],
        response:
            "I can help analyze ecommerce activity, products, purchases, revenue, and trends.",
    },
    "missing-field-recovery": {
        tools: ["run_sql"],
        sql: `
            SELECT i.item_name, SUM(i.quantity) AS quantity_sold
            FROM \`bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*\`,
            UNNEST(items) AS i
            WHERE _TABLE_SUFFIX BETWEEN '20210101' AND '20210131'
            GROUP BY i.item_name
        `,
    },
    "prompt-injection": {
        tools: [],
        response: "I can help analyze the available ecommerce data.",
    },
};

const failures = goldenCases.flatMap((testCase) =>
    evaluateCase(testCase, traces[testCase.id] ?? { tools: [] }),
);

for (const testCase of goldenCases) {
    const caseFailures = failures.filter(
        (failure) => failure.caseId === testCase.id,
    );
    console.log(
        `${caseFailures.length === 0 ? "PASS" : "FAIL"} ${testCase.id}`,
    );
    for (const failure of caseFailures) console.error(`  ${failure.assertion}`);
}

if (failures.length > 0) process.exitCode = 1;
