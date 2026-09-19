import { AppError } from "./base";

export class DailyPromptLimitError extends AppError {
    readonly code = "DAILY_PROMPT_LIMIT";
    constructor(limit: number) {
        super(
            `Daily prompt limit reached (${limit} prompts/day). ` +
                `Try again after UTC midnight, or raise MAX_PROMPTS_PER_USER_PER_DAY.`,
            { details: { limit } },
        );
    }
}

export class BudgetExceededError extends AppError {
    readonly code = "DAILY_BUDGET_EXCEEDED";
    constructor(budgetUsd: number, spentUsd: number) {
        super(
            `Daily budget of $${budgetUsd.toFixed(2)} reached ` +
                `(spent $${spentUsd.toFixed(2)}). ` +
                `Try again after UTC midnight, or raise DAILY_BUDGET_USD.`,
            { details: { budgetUsd, spentUsd } },
        );
    }
}
