import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    type User,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { firebaseAuth } from "./firebase";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const authErrorMessage = (error: unknown): string => {
    const code = (error as FirebaseError | undefined)?.code;
    switch (code) {
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
        case "auth/user-not-found":
        case "auth/wrong-password":
            return "The email or password is incorrect.";
        case "auth/invalid-email":
            return "Enter a valid email address.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a moment and try again.";
        case "auth/network-request-failed":
            return "Unable to reach Firebase. Check your connection and try again.";
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
            return "Sign-in was cancelled.";
        default:
            return "We could not complete authentication. Please try again.";
    }
};

export const AuthProvider = ({
    children,
}: {
    children: ReactNode;
}): React.JSX.Element => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(
        () =>
            onAuthStateChanged(firebaseAuth, (nextUser) => {
                setUser(nextUser);
                setIsLoading(false);
            }),
        [],
    );

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isLoading,
            signIn: async (email, password) => {
                try {
                    await signInWithEmailAndPassword(
                        firebaseAuth,
                        email,
                        password,
                    );
                } catch (error) {
                    throw new Error(authErrorMessage(error));
                }
            },
            signOut: async () => {
                try {
                    await firebaseSignOut(firebaseAuth);
                } catch (error) {
                    throw new Error(authErrorMessage(error));
                }
            },
        }),
        [isLoading, user],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider.");
    }
    return context;
};
