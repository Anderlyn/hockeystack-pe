import { BigQuery } from "@google-cloud/bigquery";
import { getFirestore } from "firebase-admin/firestore";
import "./firebase-admin";
import { config } from "./config";
import type { Config } from "./config";
import { createResultStore } from "./bq/result-store";
import { createBigQueryService } from "./bq/service";
import { createUsageService } from "./usage";
import type { UsageService } from "./usage";
import { createModel } from "./agent/providers";
import { createAgent } from "./agent/loop";
import type { Agent } from "./agent/loop";
import { toolSpecs, dispatchTool } from "./agent/tools/registry";
import { SYSTEM_PROMPT } from "./agent/system-prompt";
import { resolveModel } from "./agent/models";
import type { ResolvedModel } from "./agent/models";

export interface Container {
    config: Config;
    agent: Agent;
    usage: UsageService;
    activeModel: ResolvedModel;
}

export const createContainer = (): Container => {
    const results = createResultStore();
    const bq = createBigQueryService({
        bq: new BigQuery({ projectId: config.projectId }),
        config,
        results,
    });
    const usage = createUsageService({
        firestore: getFirestore(),
        config,
    });
    const model = createModel(config);
    const agent = createAgent({
        model,
        bq,
        usage,
        config,
        systemPrompt: SYSTEM_PROMPT,
        toolSpecs,
        dispatchTool,
    });
    return {
        config,
        agent,
        usage,
        activeModel: resolveModel(config.model),
    };
};
