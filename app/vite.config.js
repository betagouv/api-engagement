import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig((env) => {
  const plugins = [react(), svgr()];

  if (process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: "sentry",
        project: "app",
        url: "https://sentry.api-engagement.beta.gouv.fr/",
        environment: env.mode,
        release: {
          name: "app",
        },
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    );
  }

  return {
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins,
    build: {
      sourcemap: true,
    },
  };
});
