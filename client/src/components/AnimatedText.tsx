import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const STYLES: Record<string, React.CSSProperties> = {
    text: {
        whiteSpace: "normal",
        lineHeight: 1.55,
    },
    paragraph: {
        margin: "0 0 0.65rem",
    },
    list: {
        margin: "0.45rem 0 0.75rem",
        paddingLeft: "1.4rem",
    },
    listItem: {
        margin: "0.18rem 0",
        paddingLeft: "0.15rem",
    },
    heading: {
        margin: "0.8rem 0 0.4rem",
        lineHeight: 1.25,
    },
    pre: {
        overflowX: "auto",
        whiteSpace: "pre",
    },
    strong: {
        color: "#182033",
        fontWeight: 800,
    },
    code: {
        padding: "0.12rem 0.3rem",
        borderRadius: "4px",
        color: "#315efb",
        background: "#e8edff",
        fontSize: "0.9em",
    },
    cursor: {
        display: "inline-block",
        width: "2px",
        height: "1em",
        marginLeft: "3px",
        verticalAlign: "-0.12em",
        background: "#315efb",
        animation: "blink 800ms steps(2, start) infinite",
    },
} as const;

interface AnimatedTextProps {
    text: string;
    speed?: number;
}

const MARKDOWN_COMPONENTS = {
    p: ({ children }: { children?: React.ReactNode }) => (
        <p style={STYLES.paragraph}>{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
        <ul style={STYLES.list}>{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
        <ol style={STYLES.list}>{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
        <li style={STYLES.listItem}>{children}</li>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 style={STYLES.heading}>{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 style={STYLES.heading}>{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 style={STYLES.heading}>{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
        <h4 style={STYLES.heading}>{children}</h4>
    ),
    pre: ({ children }: { children?: React.ReactNode }) => (
        <pre style={STYLES.pre}>{children}</pre>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
        <strong style={STYLES.strong}>{children}</strong>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
        <code style={STYLES.code}>{children}</code>
    ),
};

const AnimatedTextComponent = ({
    text,
    speed = 12,
}: AnimatedTextProps): React.JSX.Element => {
    const [visibleText, setVisibleText] = useState("");
    const visibleTextRef = useRef("");
    const previousTextRef = useRef("");

    useEffect(() => {
        if (visibleText.length >= text.length) {
            return;
        }

        const timer = window.setTimeout(() => {
            const nextText = text.slice(0, visibleText.length + 1);
            visibleTextRef.current = nextText;
            setVisibleText(nextText);
        }, speed);

        return () => window.clearTimeout(timer);
    }, [speed, text, visibleText]);

    useEffect(() => {
        const previousText = previousTextRef.current;
        previousTextRef.current = text;
        if (previousText && !text.startsWith(previousText)) {
            visibleTextRef.current = text;
            setVisibleText(text);
        }
    }, [text]);

    return (
        <div style={STYLES.text}>
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                {visibleText}
            </ReactMarkdown>
            {visibleText.length < text.length && (
                <span style={STYLES.cursor} aria-hidden="true" />
            )}
        </div>
    );
};

export const AnimatedText = memo(
    AnimatedTextComponent,
    (previous, next) =>
        previous.text === next.text && previous.speed === next.speed,
);
