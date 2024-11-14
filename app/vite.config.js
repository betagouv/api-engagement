import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig((env) => {
  const plugins = [react(), svgr()];

  if (env.mode === "production") {
    plugins.push(
      sentryVitePlugin({
        org: "sentry",
        project: "api-engagement-production",
        url: "https://sentry.selego.co/",
        environment: "app",
      }),
    );
  } else if (env.mode === "staging") {
    plugins.push(
      sentryVitePlugin({
        org: "sentry",
        project: "api-engagement-staging",
        url: "https://sentry.selego.co/",
        environment: "app",
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
