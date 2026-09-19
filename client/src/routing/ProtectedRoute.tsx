import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const STYLES = {
    loading: {
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        color: "#68738a",
    } satisfies React.CSSProperties,
} as const;

export const ProtectedRoute = (): React.JSX.Element => {
    const { isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <main style={STYLES.loading}>Loading...</main>;
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
};
