import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ChatTurn } from "../components/chat/ChatTurn";
import { useChat } from "../hooks/useChat";

const STYLES: Record<string, React.CSSProperties> = {
    page: {
        width: "min(1180px, 100%)",
        minHeight: "100vh",
        margin: "0 auto",
        padding: "2rem clamp(1rem, 4vw, 3rem)",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid #e3e7f0",
    },
    eyebrow: {
        margin: "0 0 0.25rem",
        color: "#315efb",
        fontSize: "0.75rem",
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
    },
    heading: {
        margin: 0,
        letterSpacing: "-0.04em",
    },
    actions: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    userName: {
        maxWidth: "180px",
        overflow: "hidden",
        color: "#68738a",
        fontSize: "0.85rem",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    usage: {
        color: "#68738a",
        fontSize: "0.8rem",
    },
    secondaryButton: {
        padding: "0.55rem 0.8rem",
        border: 0,
        borderRadius: "10px",
        color: "#43506b",
        background: "#edf0f6",
        fontWeight: 700,
    },
    box: {
        display: "flex",
        minHeight: "calc(100vh - 160px)",
        marginTop: "1.5rem",
        padding: "0.75rem",
        flexDirection: "column",
        border: "1px solid #dce2ee",
        borderRadius: "20px",
        background: "rgb(255 255 255 / 78%)",
    },
    stream: {
        minHeight: 0,
        flex: 1,
        padding: "clamp(1rem, 3vw, 2.5rem)",
        overflowY: "auto",
    },
    empty: {
        display: "grid",
        maxWidth: "460px",
        margin: "auto",
        placeItems: "center",
        textAlign: "center",
    },
    emptyHeading: {
        margin: 0,
        fontSize: "clamp(1.4rem, 3vw, 2rem)",
        letterSpacing: "-0.03em",
    },
    emptyText: {
        margin: "0.75rem 0 0",
        color: "#68738a",
        lineHeight: 1.6,
    },
    composer: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        margin: "0.75rem 0 0",
        padding: "0.5rem",
        border: "1px solid #dce2ee",
        borderRadius: "14px",
        background: "rgb(255 255 255 / 92%)",
    },
    input: {
        flex: 1,
        minWidth: 0,
        padding: "0.8rem",
        border: 0,
        outline: 0,
        background: "transparent",
    },
    sendButton: {
        padding: "0.75rem 1.1rem",
        border: 0,
        borderRadius: "10px",
        color: "#fff",
        background: "#315efb",
        fontWeight: 700,
    },
};

export const ChatPage = (): React.JSX.Element => {
    const { signOut, user } = useAuth();
    const { turns, isStreaming, sendMessage, usage } = useChat();
    const [draft, setDraft] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const streamRef = useRef<HTMLElement>(null);

    const scrollToBottom = (): void => {
        const stream = streamRef.current;
        if (stream) stream.scrollTop = stream.scrollHeight;
        window.scrollTo(0, document.documentElement.scrollHeight);
    };

    useLayoutEffect(() => {
        scrollToBottom();
    });

    useLayoutEffect(() => {
        const stream = streamRef.current;
        if (!stream) return;
        const resizeObserver = new ResizeObserver(scrollToBottom);
        const mutationObserver = new MutationObserver(scrollToBottom);
        resizeObserver.observe(stream);
        mutationObserver.observe(stream, {
            childList: true,
            characterData: true,
            subtree: true,
        });
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, []);

    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const message = draft;
        setDraft("");
        await sendMessage(message);
    };

    return (
        <main style={STYLES.page}>
            <header style={STYLES.header}>
                <div>
                    <p style={STYLES.eyebrow}>HockeyStack Technical Task</p>
                    <h1 style={STYLES.heading}>
                        Loki: Data Analytics Assistant
                    </h1>
                </div>
                <div style={STYLES.actions}>
                    {usage && (
                        <span style={STYLES.usage}>
                            {usage.remaining} prompt
                            {usage.remaining === 1 ? "" : "s"} left today
                        </span>
                    )}
                    <span style={STYLES.userName}>{user?.displayName}</span>
                    <button
                        style={STYLES.secondaryButton}
                        type="button"
                        onClick={() => {
                            setAuthError(null);
                            void signOut().catch((reason: unknown) => {
                                setAuthError(
                                    reason instanceof Error
                                        ? reason.message
                                        : "Unable to sign out.",
                                );
                            });
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </header>
            <section style={STYLES.box}>
                <section
                    ref={streamRef}
                    aria-live="polite"
                    style={STYLES.stream}
                >
                    {turns.length === 0 && (
                        <div style={STYLES.empty}>
                            <h2 style={STYLES.emptyHeading}>
                                What would you like to know?
                            </h2>
                            <p style={STYLES.emptyText}>
                                Ask Loki to explore your data, find trends, or
                                build a chart.
                            </p>
                        </div>
                    )}
                    {turns.map((turn, index) => (
                        <ChatTurn
                            key={`${turn.message.content}-${index}`}
                            turn={turn}
                        />
                    ))}
                    {authError && <p role="alert">{authError}</p>}
                </section>
                <form style={STYLES.composer} onSubmit={submit}>
                    <input
                        style={STYLES.input}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Ask about your data"
                        disabled={isStreaming}
                    />
                    <button
                        style={STYLES.sendButton}
                        type="submit"
                        disabled={isStreaming || !draft.trim()}
                    >
                        Send
                    </button>
                </form>
            </section>
        </main>
    );
};
