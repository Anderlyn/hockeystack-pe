import type { ChatModel } from "../model";
import type { Config } from "../../config";
import { AnthropicModel } from "./anthropic";
import { GeminiModel } from "./gemini";
import { resolveModel } from "../models";
import { config as defaultConfig } from "../../config";

export const createModel = (config: Config): ChatModel => {
    const r = resolveModel(config.model);
    return r.provider === "gemini"
        ? new GeminiModel(r.id, r.location, config)
        : new AnthropicModel(r.id, r.location, config);
};

export const getModel = (): ChatModel => createModel(defaultConfig);
