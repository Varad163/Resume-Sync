import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  server: {
    port: 5199,
    // The console talks to the API on the same origin in production; in dev the
    // proxy keeps that true so no CORS or base-URL branching is needed.
    proxy: {
      "/v1": { target: process.env.API_ORIGIN ?? "http://localhost:8787", changeOrigin: true },
      "/health": { target: process.env.API_ORIGIN ?? "http://localhost:8787", changeOrigin: true },
    },
  },
  build: { outDir: `${here}dist`, emptyOutDir: true },
});
