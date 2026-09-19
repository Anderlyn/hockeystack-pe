// For now, we only support Anthropic and Gemini models. If you add a new model, please add it to the MODELS map below.
import { UnknownModelError } from "../exceptions";

export type Provider = "anthropic" | "gemini";

export interface ModelEntry {
    provider: Provider;
    location: string;
}

export const MODELS: Record<string, ModelEntry> = {
    "claude-opus-4-5@20251101": { provider: "anthropic", location: "global" },
    "claude-sonnet-5": { provider: "anthropic", location: "global" },
    "claude-sonnet-4-5@20250929": { provider: "anthropic", location: "global" },
    "claude-haiku-4-5@20251001": { provider: "anthropic", location: "global" },
    "gemini-2.5-pro": { provider: "gemini", location: "global" },
    "gemini-2.5-flash": { provider: "gemini", location: "global" },
    "gemini-2.0-flash": { provider: "gemini", location: "global" },
};

export interface ResolvedModel {
    id: string;
    provider: Provider;
    location: string;
}

export const resolveModel = (id: string): ResolvedModel => {
    const entry = MODELS[id];
    if (entry) return { id, ...entry };
    if (id.startsWith("claude-"))
        return { id, provider: "anthropic", location: "global" };
    if (id.startsWith("gemini-"))
        return { id, provider: "gemini", location: "global" };
    throw new UnknownModelError(id);
};
