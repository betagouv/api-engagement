import { defineConfig } from "vitest/config";

export default defineConfig({
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
