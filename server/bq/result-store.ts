import type { Row } from "../../shared/events";

export interface CachedResult {
    columns: string[];
    rows: Row[];
}

export interface ResultStore {
    set: (id: string, value: CachedResult) => void;
    get: (id: string) => CachedResult | undefined;
}

export const createResultStore = (capacity = 50): ResultStore => {
    const store = new Map<string, CachedResult>();
    return {
        set: (id, value) => {
            if (store.has(id)) store.delete(id);
            store.set(id, value);
            while (store.size > capacity) {
                const oldest = store.keys().next().value;
                if (oldest === undefined) break;
                store.delete(oldest);
            }
        },
        get: (id) => store.get(id),
    };
};
