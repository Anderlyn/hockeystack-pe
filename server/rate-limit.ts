import { getFirestore } from "firebase-admin/firestore";
import { config } from "./config";
import { DailyPromptLimitError } from "./exceptions";
import "./firebase-admin";

const collectionName = "daily_prompt_usage";

const today = (): string => new Date().toISOString().slice(0, 10);

const firestore = getFirestore();

export interface DailyUsage {
    day: string;
    used: number;
    remaining: number;
    limit: number;
}

const usageFor = (day: string, used: number): DailyUsage => ({
    day,
    used,
    remaining: Math.max(0, config.maxPromptsPerDay - used),
    limit: config.maxPromptsPerDay,
});

export const consumeDailyPrompt = async (): Promise<DailyUsage> => {
    const day = today();
    const reference = firestore.collection(collectionName).doc(day);

    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const current = snapshot.exists
            ? Number(snapshot.data()?.used ?? 0)
            : 0;

        if (current >= config.maxPromptsPerDay) {
            throw new DailyPromptLimitError(config.maxPromptsPerDay);
        }

        const usage = usageFor(day, current + 1);
        transaction.set(
            reference,
            {
                date: day,
                used: usage.used,
                updatedAt: new Date(),
            },
            { merge: true },
        );
        return usage;
    });
};

export const dailyUsage = async (): Promise<DailyUsage> => {
    const day = today();
    const reference = firestore.collection(collectionName).doc(day);
    const snapshot = await reference.get();
    const used = snapshot.exists ? Number(snapshot.data()?.used ?? 0) : 0;
    return usageFor(day, used);
};
