import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    hookTimeout: 30000,
  },
});
