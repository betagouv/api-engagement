import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig((env) => {
  const plugins = [react(), svgr(), tailwindcss()];

  // jstag.js poste ses événements vers l'API de l'environnement qui le sert (prod, staging, bac à sable) :
  // l'hôte par défaut du fichier source est remplacé par VITE_API_URL au build.
  const apiUrl = loadEnv(env.mode, process.cwd(), "VITE_").VITE_API_URL;
  if (env.command === "build" && apiUrl) {
    plugins.push({
      name: "jstag-event-host",
      closeBundle() {
        const file = path.resolve(__dirname, "dist/jstag.js");
        fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("https://api.api-engagement.beta.gouv.fr", apiUrl.replace(/\/+$/, "")));
      },
    });
  }

  if (process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: "betagouv",
        project: "api-engagement-app",
        url: process.env.SENTRY_HOST,
        release: {
          name: "app",
          deploy: {
            env: env.mode,
          },
        },
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    );
  }

  return {
    server: {
      port: 3000,
      host: true,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@engagement/dto": path.resolve(__dirname, "../packages/dto/src/index.ts"),
        "@engagement/taxonomy": path.resolve(__dirname, "../packages/taxonomy/src/index.ts"),
      },
    },
    plugins,
    build: {
      sourcemap: true,
    },
  };
});
