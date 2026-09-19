import type { TokenUsage } from "./model";

export interface ModelPricing {
    input: number;
    cachedInput: number;
    cacheWrite: number;
    output: number;
}

const PRICING: Record<string, ModelPricing> = {
    "gemini-2.5-flash": {
        input: 0.3,
        cachedInput: 0.075,
        cacheWrite: 0,
        output: 2.5,
    },
    "gemini-2.5-pro": {
        input: 1.25,
        cachedInput: 0.3125,
        cacheWrite: 0,
        output: 10,
    },
    "gemini-2.0-flash": {
        input: 0.1,
        cachedInput: 0.025,
        cacheWrite: 0,
        output: 0.4,
    },
    "claude-opus-4-5@20251101": {
        input: 5,
        cachedInput: 0.5,
        cacheWrite: 6.25,
        output: 25,
    },
    "claude-opus-4-8": {
        input: 5,
        cachedInput: 0.5,
        cacheWrite: 6.25,
        output: 25,
    },
    "claude-sonnet-5": {
        input: 3,
        cachedInput: 0.3,
        cacheWrite: 3.75,
        output: 15,
    },
    "claude-sonnet-4-5@20250929": {
        input: 3,
        cachedInput: 0.3,
        cacheWrite: 3.75,
        output: 15,
    },
    "claude-haiku-4-5@20251001": {
        input: 1,
        cachedInput: 0.1,
        cacheWrite: 1.25,
        output: 5,
    },
};

const DEFAULT_PRICING: ModelPricing = {
    input: 5,
    cachedInput: 0.5,
    cacheWrite: 6.25,
    output: 25,
};

export const pricingFor = (modelId: string): ModelPricing =>
    PRICING[modelId] ?? DEFAULT_PRICING;

export const costUsd = (modelId: string, usage: TokenUsage): number => {
    const price = pricingFor(modelId);
    return (
        (usage.uncachedInputTokens * price.input +
            usage.cachedInputTokens * price.cachedInput +
            usage.cacheWriteTokens * price.cacheWrite +
            usage.outputTokens * price.output) /
        1_000_000
    );
};
