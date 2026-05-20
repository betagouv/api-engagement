import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@engagement/taxonomy": path.resolve(__dirname, "../packages/taxonomy/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/user-scoring": "http://localhost:4000",
      "/poc": "http://localhost:4000",
    },
  },
});
