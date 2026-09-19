import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SSEEvent, ChatMessage } from "../shared/events";
import { runAgent } from "./agent/loop";
import { resolveModel } from "./agent/models";
import { config } from "./config";
import { AppError, DailyPromptLimitError, errorMessage } from "./exceptions";
import { consumeDailyPrompt, dailyUsage } from "./rate-limit";
import { requireFirebaseAuth } from "./auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const active = resolveModel(config.model);

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
        if (content.length > config.maxPromptChars) {
            return {
                error: `Each message is limited to ${config.maxPromptChars} characters.`,
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

app.get("/api/health", async (_req, res) => {
    const usage = await dailyUsage();
    res.json({
        ok: true,
        provider: active.provider,
        model: active.id,
        location: active.location,
        project: config.projectId,
        usage,
    });
});

app.post("/api/chat", requireFirebaseAuth, async (req, res) => {
    const validation = validateChatMessages(req.body?.messages);
    if (validation.error || !validation.messages) {
        res.status(400).json({
            error: validation.error,
        });
        return;
    }
    const messages = validation.messages;

    if (!req.firebaseUser?.uid) {
        res.status(401).json({ error: "Authenticated user is missing." });
        return;
    }

    let usage;
    try {
        usage = await consumeDailyPrompt();
    } catch (err) {
        if (err instanceof DailyPromptLimitError) {
            res.status(429).json({
                error: err.message,
                usage: await dailyUsage(),
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
        send({ type: "usage", usage });
        await runAgent(messages, send);
    } catch (err) {
        if (err instanceof AppError) {
            console.error(
                `[chat] ${err.code}: ${err.message}`,
                err.details ?? {},
            );
            send({ type: "error", message: err.message });
        } else {
            console.error("[chat] unexpected error:", err);
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
    console.log(
        `Server on :${config.port} (provider=${active.provider}, model=${active.id}, project=${config.projectId})`,
    );
});
