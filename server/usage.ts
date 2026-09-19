import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import type { Config } from "./config";
import type { DailyUsage } from "../shared/events";
import type { TokenUsage } from "./agent/model";
import { BudgetExceededError, DailyPromptLimitError } from "./exceptions";
import { costUsd } from "./agent/pricing";
import { logger } from "./logger";

const today = (): string => new Date().toISOString().slice(0, 10);

export interface UsageService {
    consumePrompt: (uid: string) => Promise<DailyUsage>;
    recordModelUsage: (modelId: string, usage: TokenUsage) => Promise<void>;
    dailyUsage: (uid: string) => Promise<DailyUsage>;
    isOverBudget: () => Promise<boolean>;
}

export interface UsageServiceDeps {
    firestore: Firestore;
    config: Config;
}

export const createUsageService = (deps: UsageServiceDeps): UsageService => {
    const { firestore, config } = deps;
    const promptDoc = (day: string, uid: string) =>
        firestore.collection("daily_prompt_usage").doc(`${day}__${uid}`);
    const spendDoc = (day: string) =>
        firestore.collection("daily_spend").doc(day);

    const usageView = (day: string, used: number): DailyUsage => ({
        day,
        used,
        remaining: Math.max(0, config.maxPromptsPerUserPerDay - used),
        limit: config.maxPromptsPerUserPerDay,
    });

    const currentSpend = async (day: string): Promise<number> => {
        const snapshot = await spendDoc(day).get();
        return snapshot.exists ? Number(snapshot.data()?.usd ?? 0) : 0;
    };

    const isOverBudget = async (): Promise<boolean> =>
        (await currentSpend(today())) >= config.dailyBudgetUsd;

    const consumePrompt = async (uid: string): Promise<DailyUsage> => {
        const day = today();
        const spend = await currentSpend(day);
        if (spend >= config.dailyBudgetUsd) {
            throw new BudgetExceededError(config.dailyBudgetUsd, spend);
        }
        return firestore.runTransaction(async (transaction) => {
            const reference = promptDoc(day, uid);
            const snapshot = await transaction.get(reference);
            const used = snapshot.exists
                ? Number(snapshot.data()?.used ?? 0)
                : 0;
            if (used >= config.maxPromptsPerUserPerDay) {
                throw new DailyPromptLimitError(config.maxPromptsPerUserPerDay);
            }
            transaction.set(
                reference,
                { day, uid, used: used + 1, updatedAt: new Date() },
                { merge: true },
            );
            return usageView(day, used + 1);
        });
    };

    const recordModelUsage = async (
        modelId: string,
        usage: TokenUsage,
    ): Promise<void> => {
        const day = today();
        const usd = costUsd(modelId, usage);
        await spendDoc(day).set(
            { day, usd: FieldValue.increment(usd), updatedAt: new Date() },
            { merge: true },
        );
        logger.info("usage.recorded", {
            modelId,
            usd,
            uncachedInputTokens: usage.uncachedInputTokens,
            cachedInputTokens: usage.cachedInputTokens,
            cacheWriteTokens: usage.cacheWriteTokens,
            outputTokens: usage.outputTokens,
        });
    };

    const dailyUsage = async (uid: string): Promise<DailyUsage> => {
        const day = today();
        const snapshot = await promptDoc(day, uid).get();
        const used = snapshot.exists ? Number(snapshot.data()?.used ?? 0) : 0;
        return usageView(day, used);
    };

    return { consumePrompt, recordModelUsage, dailyUsage, isOverBudget };
};
