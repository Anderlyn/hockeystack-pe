const env = (name: string, fallback: string): string => {
    const v = process.env[name];
    return v && v.length > 0 ? v : fallback;
};

export const config = {
    projectId: env("GOOGLE_CLOUD_PROJECT", "hockeystack-pe"),
    // A single model knob; the provider + Vertex location are resolved from the
    // catalog in server/agent/models.ts. Dev default is Haiku 4.5.
    model: env("MODEL", "claude-haiku-4-5@20251001"),
    // BigQuery
    bqLocation: env("BQ_LOCATION", "US"),
    maxBytesBilled: Number(env("MAX_BYTES_BILLED", "5000000000")),
    // Agent
    maxTurns: Number(env("MAX_TURNS", "8")),
    maxPromptsPerDay: Number(env("MAX_PROMPTS_PER_DAY", "50")),
    // Server
    port: Number(env("PORT", "8080")),
} as const;
