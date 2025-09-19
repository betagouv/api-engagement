import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.integration.ts"],
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    hookTimeout: 120000,
    testTimeout: 120000,
  },
});
