import { config } from "./config";
import { DailyPromptLimitError } from "./exceptions";

// In-memory daily prompt budget. Single-instance only (matches the demo's
// --max-instances=1); production would move this to Redis/Firestore. Resets at
// UTC midnight.
let day = "";
let count = 0;

const today = (): string => new Date().toISOString().slice(0, 10);

const rollover = (): void => {
    const d = today();
    if (d !== day) {
        day = d;
        count = 0;
    }
};

/** Consume one prompt against today's budget. Throws when it's exhausted. */
export const consumeDailyPrompt = (): void => {
    rollover();
    if (count >= config.maxPromptsPerDay) {
        throw new DailyPromptLimitError(config.maxPromptsPerDay);
    }
    count += 1;
};

export interface DailyUsage {
    day: string;
    used: number;
    remaining: number;
    limit: number;
}

export const dailyUsage = (): DailyUsage => {
    rollover();
    return {
        day,
        used: count,
        remaining: Math.max(0, config.maxPromptsPerDay - count),
        limit: config.maxPromptsPerDay,
    };
};
