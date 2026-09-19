export const DATASET = "bigquery-public-data.ga4_obfuscated_sample_ecommerce";

export const EVENTS_WILDCARD = `\`${DATASET}.events_*\``;

export const dailyTable = (tableId: string): string =>
    `\`${DATASET}.${tableId}\``;
