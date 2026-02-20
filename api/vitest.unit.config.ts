import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/vitest/unit.setup.ts"],
    include: [
      "src/**/__tests__/**/*.{test,spec}.ts",
      "src/**/__tests__/**/*.{test,spec}.tsx",
    ],
    exclude: ["tests/integration/**", "node_modules", "dist"],
    hookTimeout: 30000,
  },
});
