import { defineConfig } from "vitest/config";

export default defineConfig({
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
