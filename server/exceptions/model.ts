import { AppError, errorMessage } from "./base";

export class UnknownModelError extends AppError {
    readonly code = "UNKNOWN_MODEL";
    constructor(id: string) {
        super(
            `Unknown model "${id}". Add it to server/agent/models.ts, or use a "claude-*" or "gemini-*" id.`,
            { details: { id } },
        );
    }
}

// An existing model request failed. This is usually a provider outage or misconfiguration.
export class ProviderError extends AppError {
    readonly code = "PROVIDER_ERROR";
    constructor(provider: string, model: string, cause: unknown) {
        super(
            `${provider} request failed for model "${model}": ${errorMessage(cause)}`,
            {
                cause,
                details: { provider, model },
            },
        );
    }
}
