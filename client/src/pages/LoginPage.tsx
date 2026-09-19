import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const STYLES: Record<string, React.CSSProperties> = {
    page: {
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: "1.5rem",
        background:
            "radial-gradient(circle at 20% 0%, #e9edff 0, transparent 35%), #f5f7fb",
    },
    card: {
        width: "min(100%, 430px)",
        padding: "3rem",
        border: "1px solid #e3e7f0",
        borderRadius: "20px",
        background: "#fff",
    },
    heading: {
        margin: 0,
        letterSpacing: "-0.04em",
        fontSize: "clamp(2rem, 5vw, 2.8rem)",
        lineHeight: 1.05,
    },
    copy: {
        margin: "1rem 0 2rem",
        color: "#68738a",
        lineHeight: 1.6,
    },
    label: {
        display: "block",
        margin: "1rem 0 0.4rem",
        color: "#43506b",
        fontSize: "0.85rem",
        fontWeight: 700,
    },
    input: {
        width: "100%",
        padding: "0.8rem",
        border: "1px solid #dce2ee",
        borderRadius: "10px",
        outlineColor: "#315efb",
    },
    button: {
        width: "100%",
        marginTop: "1.5rem",
        padding: "0.85rem 1rem",
        border: 0,
        borderRadius: "10px",
        color: "#fff",
        background: "#315efb",
        fontWeight: 700,
    },
    error: {
        color: "#bf3d4b",
    },
} as const;

export const LoginPage = (): React.JSX.Element => {
    const { isLoading, signIn, user } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isLoading && user) {
            navigate("/chat", { replace: true });
        }
    }, [isLoading, navigate, user]);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await signIn(email, password);
            navigate("/chat", { replace: true });
        } catch (reason: unknown) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "We could not complete authentication. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main style={STYLES.page} aria-label="Login page">
            <section style={STYLES.card}>
                <h1 style={STYLES.heading}>Technical Task</h1>
                <p style={STYLES.copy}>
                    Hello everyone @ <b>HockeyStack</b>. Developed by Sebastian
                    Lopez.
                </p>
                <form onSubmit={submit}>
                    <label style={STYLES.label} htmlFor="email">
                        Email
                    </label>
                    <input
                        style={STYLES.input}
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        required
                    />
                    <label style={STYLES.label} htmlFor="password">
                        Password
                    </label>
                    <input
                        style={STYLES.input}
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        minLength={6}
                        required
                    />
                    <button
                        style={STYLES.button}
                        type="submit"
                        disabled={isLoading || isSubmitting}
                    >
                        {isSubmitting ? "Please wait..." : "Sign in"}
                    </button>
                </form>
                {error && <p style={STYLES.error}>{error}</p>}
            </section>
        </main>
    );
};
