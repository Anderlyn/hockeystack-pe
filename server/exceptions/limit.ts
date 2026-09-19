import { AppError } from "./base";

// The per-day prompt budget has been used up for the current UTC day.
export class DailyPromptLimitError extends AppError {
    readonly code = "DAILY_PROMPT_LIMIT";
    constructor(limit: number) {
        super(
            `Daily prompt limit reached (${limit} prompts/day). ` +
                `Try again after UTC midnight, or raise MAX_PROMPTS_PER_DAY.`,
            { details: { limit } },
        );
    }
}
