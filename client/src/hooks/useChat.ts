import { useCallback, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { ChatMessage, DailyUsage, SSEEvent } from "../../../shared/events";

const maxPromptChars = 4000;

export interface ChatTurn {
    message: ChatMessage;
    events: SSEEvent[];
}

interface ChatState {
    turns: ChatTurn[];
    isStreaming: boolean;
    usage: DailyUsage | null;
}

const initialState: ChatState = {
    turns: [],
    isStreaming: false,
    usage: null,
};

const parseEvent = (line: string): SSEEvent | null => {
    if (!line.startsWith("data:")) {
        return null;
    }

    const payload = line.slice(5).trim();
    return payload.length > 0 ? (JSON.parse(payload) as SSEEvent) : null;
};

export const useChat = (): ChatState & {
    sendMessage: (content: string) => Promise<void>;
} => {
    const [state, setState] = useState<ChatState>(initialState);
    const { user } = useAuth();

    const sendMessage = useCallback(
        async (content: string): Promise<void> => {
            const trimmed = content.trim();
            if (!trimmed) {
                return;
            }
            const userMessage: ChatMessage = { role: "user", content: trimmed };
            if (trimmed.length > maxPromptChars) {
                setState((current) => ({
                    ...current,
                    turns: [
                        ...current.turns,
                        {
                            message: userMessage,
                            events: [
                                {
                                    type: "error",
                                    message: `Please keep questions under ${maxPromptChars.toLocaleString()} characters.`,
                                },
                            ],
                        },
                    ],
                }));
                return;
            }

            const history = state.turns.flatMap((turn) => [
                turn.message,
                ...turn.events
                    .filter(
                        (
                            event,
                        ): event is { type: "assistant_delta"; text: string } =>
                            event.type === "assistant_delta",
                    )
                    .map((event) => ({
                        role: "assistant" as const,
                        content: event.text,
                    })),
            ]);
            const turn: ChatTurn = { message: userMessage, events: [] };

            setState((current) => ({
                ...current,
                turns: [...current.turns, turn],
                isStreaming: true,
            }));

            try {
                if (!user) {
                    throw new Error("You must be signed in to chat.");
                }
                const token = await user.getIdToken();
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        messages: [...history, userMessage],
                    }),
                });

                if (!response.ok || !response.body) {
                    const body = (await response.json().catch(() => null)) as {
                        error?: string;
                        usage?: DailyUsage;
                    } | null;
                    if (body?.usage) {
                        setState((current) => ({
                            ...current,
                            usage: body.usage ?? current.usage,
                        }));
                    }
                    throw new Error(
                        body?.error ??
                            `Chat request failed (${response.status}).`,
                    );
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                const appendEvent = (event: SSEEvent): void => {
                    setState((current) => {
                        const turns = [...current.turns];
                        const last = turns[turns.length - 1];
                        turns[turns.length - 1] = {
                            ...last,
                            events: [...last.events, event],
                        };
                        return {
                            ...current,
                            turns,
                            isStreaming:
                                event.type !== "done" && event.type !== "error",
                            usage:
                                event.type === "usage"
                                    ? event.usage
                                    : current.usage,
                        };
                    });
                };

                while (true) {
                    const { done, value } = await reader.read();
                    buffer += decoder.decode(value, { stream: !done });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";
                    for (const line of lines) {
                        const event = parseEvent(line);
                        if (event) {
                            appendEvent(event);
                        }
                    }
                    if (done) {
                        break;
                    }
                }
            } catch (error) {
                setState((current) => ({
                    ...current,
                    turns: current.turns.map((currentTurn, index) =>
                        index === current.turns.length - 1
                            ? {
                                  ...currentTurn,
                                  events: [
                                      ...currentTurn.events,
                                      {
                                          type: "error",
                                          message:
                                              error instanceof Error
                                                  ? error.message
                                                  : "Chat request failed.",
                                      },
                                  ],
                              }
                            : currentTurn,
                    ),
                    isStreaming: false,
                }));
            }
        },
        [state.turns, user],
    );

    return { ...state, sendMessage };
};
