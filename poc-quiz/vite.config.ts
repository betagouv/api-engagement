import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/user-scoring": "http://localhost:4000",
      "/poc": "http://localhost:4000",
    },
  },
});
