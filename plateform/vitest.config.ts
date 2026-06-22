import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["app/**/__tests__/**/*.{test,spec}.ts"],
    env: {
      PUBLISHER_API_KEY: "test-key",
      SERVER_API_URL: "http://fake-api.test",
      TZ: "UTC",
    },
  },
});
