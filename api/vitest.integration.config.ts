import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@engagement/taxonomy": path.resolve(__dirname, "../packages/taxonomy/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/vitest/integration.setup.ts"],
    globalSetup: ["./tests/vitest/global.setup.ts"],
    include: ["tests/integration/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    hookTimeout: 30000,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
