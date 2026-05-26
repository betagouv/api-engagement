import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
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
