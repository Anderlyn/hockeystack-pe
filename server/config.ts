import "dotenv/config";

const env = (name: string, fallback: string): string => {
    const v = process.env[name];
    return v && v.length > 0 ? v : fallback;
};

export const config = {
    projectId: env("GOOGLE_CLOUD_PROJECT", "hockeystack-pe"),
    model: env("MODEL", "gemini-2.5-flash"),
    bqLocation: env("BQ_LOCATION", "US"),
    maxBytesBilled: Number(env("MAX_BYTES_BILLED", "5000000000")),
    maxTurns: Number(env("MAX_TURNS", "8")),
    maxPromptsPerDay: Number(env("MAX_PROMPTS_PER_DAY", "50")),
    maxPromptChars: Number(env("MAX_PROMPT_CHARS", "4000")),
    maxConversationChars: Number(env("MAX_CONVERSATION_CHARS", "16000")),
    maxConversationMessages: Number(env("MAX_CONVERSATION_MESSAGES", "20")),
    port: Number(env("PORT", "8080")),
} as const;
