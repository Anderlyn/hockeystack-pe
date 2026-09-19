import type { ChatModel } from "../model";
import { AnthropicModel } from "./anthropic";
import { GeminiModel } from "./gemini";
import { resolveModel } from "../models";
import { config } from "../../config";

export const getModel = (): ChatModel => {
    const r = resolveModel(config.model);
    return r.provider === "gemini"
        ? new GeminiModel(r.id, r.location)
        : new AnthropicModel(r.id, r.location);
};
