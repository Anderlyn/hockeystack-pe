import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const STYLES = {
    text: {
        whiteSpace: "normal",
        lineHeight: 1.55,
    } satisfies React.CSSProperties,
    paragraph: {
        margin: "0 0 0.65rem",
    } satisfies React.CSSProperties,
    list: {
        margin: "0.45rem 0 0.75rem",
        paddingLeft: "1.4rem",
    } satisfies React.CSSProperties,
    listItem: {
        margin: "0.18rem 0",
        paddingLeft: "0.15rem",
    } satisfies React.CSSProperties,
    heading: {
        margin: "0.8rem 0 0.4rem",
        lineHeight: 1.25,
    } satisfies React.CSSProperties,
    pre: {
        overflowX: "auto",
        whiteSpace: "pre",
    } satisfies React.CSSProperties,
    strong: {
        color: "#182033",
        fontWeight: 800,
    } satisfies React.CSSProperties,
    code: {
        padding: "0.12rem 0.3rem",
        borderRadius: "4px",
        color: "#315efb",
        background: "#e8edff",
        fontSize: "0.9em",
    } satisfies React.CSSProperties,
    cursor: {
        display: "inline-block",
        width: "2px",
        height: "1em",
        marginLeft: "3px",
        verticalAlign: "-0.12em",
        background: "#315efb",
        animation: "blink 800ms steps(2, start) infinite",
    } satisfies React.CSSProperties,
} as const;

interface AnimatedTextProps {
    text: string;
    speed?: number;
}

export const AnimatedText = ({
    text,
    speed = 12,
}: AnimatedTextProps): React.JSX.Element => {
    const [visibleText, setVisibleText] = useState("");

    useEffect(() => {
        if (visibleText.length >= text.length) {
            return;
        }

        const timer = window.setTimeout(() => {
            setVisibleText(text.slice(0, visibleText.length + 1));
        }, speed);

        return () => window.clearTimeout(timer);
    }, [speed, text, visibleText]);

    useEffect(() => {
        if (!text.startsWith(visibleText)) {
            setVisibleText("");
        }
    }, [text, visibleText]);

    return (
        <div style={STYLES.text}>
            <ReactMarkdown
                components={{
                    p: ({ children }) => (
                        <p style={STYLES.paragraph}>{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul style={STYLES.list}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol style={STYLES.list}>{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li style={STYLES.listItem}>{children}</li>
                    ),
                    h1: ({ children }) => (
                        <h1 style={STYLES.heading}>{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 style={STYLES.heading}>{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 style={STYLES.heading}>{children}</h3>
                    ),
                    h4: ({ children }) => (
                        <h4 style={STYLES.heading}>{children}</h4>
                    ),
                    pre: ({ children }) => (
                        <pre style={STYLES.pre}>{children}</pre>
                    ),
                    strong: ({ children }) => (
                        <strong style={STYLES.strong}>{children}</strong>
                    ),
                    code: ({ children }) => (
                        <code style={STYLES.code}>{children}</code>
                    ),
                }}
            >
                {visibleText}
            </ReactMarkdown>
            {visibleText.length < text.length && (
                <span style={STYLES.cursor} aria-hidden="true" />
            )}
        </div>
    );
};
