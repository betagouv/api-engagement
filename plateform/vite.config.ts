import { sentryVitePlugin } from "@sentry/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const plugins = [tailwindcss(), reactRouter()];

  if (process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: "betagouv",
        project: "api-engagement-plateform",
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
      // Cible par défaut de Vite 8 (baseline widely available), avec Firefox abaissé à 102 (ESR encore utilisé, sinon l'hydratation plante).
      target: ["chrome111", "edge111", "firefox102", "safari16.4", "ios16.4"],
      sourcemap: "hidden",
    },
  };
});
