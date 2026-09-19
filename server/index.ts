import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SSEEvent, ChatMessage } from "../shared/events";
import { runAgent } from "./agent/loop";
import { resolveModel } from "./agent/models";
import { config } from "./config";
import { AppError, DailyPromptLimitError, errorMessage } from "./exceptions";
import { consumeDailyPrompt, dailyUsage } from "./rate-limit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const active = resolveModel(config.model);

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        provider: active.provider,
        model: active.id,
        location: active.location,
        project: config.projectId,
        usage: dailyUsage(),
    });
});

app.post("/api/chat", async (req, res) => {
    const messages = (req.body?.messages ?? []) as ChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
            error: "Body must include a non-empty 'messages' array.",
        });
        return;
    }

    try {
        consumeDailyPrompt();
    } catch (err) {
        if (err instanceof DailyPromptLimitError) {
            res.status(429).json({ error: err.message });
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
