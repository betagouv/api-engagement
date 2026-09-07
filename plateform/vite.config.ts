import { sentryVitePlugin } from "@sentry/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const plugins = [tailwindcss(), reactRouter()];

  if (process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: "sentry",
        project: "plateform",
        url: process.env.SENTRY_HOST,
        release: {
          name: `plateform-${mode}`,
        },
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    );
  }

  return {
    css: {
      lightningcss: {
        errorRecovery: true,
      },
    },
    server: {
      host: true,
    },
    resolve: {
      dedupe: ["react", "react-dom", "react-router"],
      tsconfigPaths: true,
    },
    plugins,
    build: {
      sourcemap: "hidden",
    },
  };
});
