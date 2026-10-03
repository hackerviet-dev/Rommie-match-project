import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: process.env.VITE_BASE_PATH ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target:
            process.env.VITE_DEV_API_TARGET ??
            env.VITE_DEV_API_TARGET ??
            "http://localhost:5000",
          changeOrigin: true,
        },
        "/hubs": {
          target:
            process.env.VITE_DEV_API_TARGET ??
            env.VITE_DEV_API_TARGET ??
            "http://localhost:5000",
          ws: true,
        },
      },
    },
  };
});
