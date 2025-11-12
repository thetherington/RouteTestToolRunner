import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    server: {
        proxy: {
            "/api": "http://127.0.0.1:8080",
        },
    },
    plugins: [
        react({
            babel: {
                plugins: [["babel-plugin-react-compiler"]],
            },
        }),
    ],
    build: {
        outDir: "../internal/web", // relative to frontend/
        emptyOutDir: true, // clean before build
    },
});
