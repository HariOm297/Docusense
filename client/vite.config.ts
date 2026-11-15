import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In local dev, forward /api calls to the Express server (same relative path as production).
    proxy: { "/api": "http://localhost:3001" },
  },
});