import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    root: "client",
    plugins: [react()],
    server: {
        proxy: {
            "/api": "http://localhost:8080",
        },
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
});
