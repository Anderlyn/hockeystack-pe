import express from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SSEEvent, ChatMessage } from "../shared/events";
import { createContainer } from "./container";
import {
    AppError,
    BudgetExceededError,
    DailyPromptLimitError,
    errorMessage,
} from "./exceptions";
import { requireFirebaseAuth } from "./auth";
import { logger } from "./logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const container = createContainer();
const { config, agent, usage, activeModel } = container;

const app = express();
app.use(express.json({ limit: "1mb" }));

const validateChatMessages = (
    value: unknown,
): { messages?: ChatMessage[]; error?: string } => {
    if (!Array.isArray(value) || value.length === 0) {
        return { error: "Body must include a non-empty 'messages' array." };
    }
    if (value.length > config.maxConversationMessages) {
        return {
            error: `Conversation is limited to ${config.maxConversationMessages} messages.`,
        };
    }

    let totalChars = 0;
    const messages: ChatMessage[] = [];
    for (const message of value) {
        if (
            !message ||
            typeof message !== "object" ||
            !("role" in message) ||
            !("content" in message) ||
            (message.role !== "user" && message.role !== "assistant") ||
            typeof message.content !== "string"
        ) {
            return {
                error: "Each message must have a user or assistant role and text content.",
            };
        }
        const content = message.content.trim();
        if (content.length === 0) {
            return { error: "Messages cannot be empty." };
        }
        if (message.role === "user" && content.length > config.maxPromptChars) {
            return {
                error: `Each question is limited to ${config.maxPromptChars} characters.`,
            };
        }
        totalChars += content.length;
        messages.push({ role: message.role, content });
    }

    if (totalChars > config.maxConversationChars) {
        return {
            error: `Conversation is limited to ${config.maxConversationChars} total characters.`,
        };
    }

    return { messages };
};

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

app.post("/api/chat", requireFirebaseAuth, async (req, res) => {
    const startedAt = performance.now();
    const requestId = randomUUID();
    logger.info("chat.request.start", {
        requestId,
        userId: req.firebaseUser?.uid,
        messageCount: Array.isArray(req.body?.messages)
            ? req.body.messages.length
            : 0,
    });
    const validation = validateChatMessages(req.body?.messages);
    if (validation.error || !validation.messages) {
        logger.warn("chat.request.invalid", {
            requestId,
            reason: validation.error,
        });
        res.status(400).json({ error: validation.error });
        return;
    }
    const messages = validation.messages;

    const userId = req.firebaseUser?.uid;
    if (!userId) {
        res.status(401).json({ error: "Authenticated user is missing." });
        return;
    }

    let usageSnapshot;
    try {
        usageSnapshot = await usage.consumePrompt(userId);
    } catch (err) {
        if (
            err instanceof DailyPromptLimitError ||
            err instanceof BudgetExceededError
        ) {
            logger.warn("chat.request.quota_exceeded", {
                requestId,
                code: err.code,
            });
            res.status(429).json({
                error: err.message,
                usage: await usage.dailyUsage(userId),
            });
            return;
        }
        throw err;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: SSEEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
        send({ type: "usage", usage: usageSnapshot });
        await agent.run(userId, messages, send);
        logger.info("chat.request.complete", {
            requestId,
            durationMs: Math.round(performance.now() - startedAt),
        });
    } catch (err) {
        if (err instanceof AppError) {
            logger.error("chat.request.error", {
                requestId,
                code: err.code,
                message: err.message,
                details: err.details,
                durationMs: Math.round(performance.now() - startedAt),
            });
            send({ type: "error", message: err.message });
        } else {
            logger.error("chat.request.unexpected_error", {
                requestId,
                error: err,
                durationMs: Math.round(performance.now() - startedAt),
            });
            send({
                type: "error",
                message: `Unexpected server error: ${errorMessage(err)}`,
            });
        }
    } finally {
        res.end();
    }
});

const clientDist = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.use((req, res) => {
    if (req.method === "GET") {
        res.sendFile(path.join(clientDist, "index.html"), (err) => {
            if (err)
                res.status(404).send(
                    "Client not built yet. Run the client build.",
                );
        });
    } else {
        res.status(404).send("Not found");
    }
});

app.listen(config.port, () => {
    logger.info("server.started", {
        port: config.port,
        provider: activeModel.provider,
        model: activeModel.id,
        project: config.projectId,
    });
});
