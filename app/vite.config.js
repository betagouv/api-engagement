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

  // jstag.js est servi par chaque environnement (prod, staging, bac à sable) : au build, son hôte d'événements
  // devient VITE_API_URL et son en-tête indique l'environnement (VITE_ENV).
  const { VITE_API_URL: apiUrl, VITE_ENV: envName } = loadEnv(env.mode, process.cwd(), "VITE_");
  if (env.command === "build" && (apiUrl || envName)) {
    plugins.push({
      name: "jstag-environment",
      closeBundle() {
        const file = path.resolve(__dirname, "dist/jstag.js");
        let content = fs.readFileSync(file, "utf8");
        if (apiUrl) content = content.replace("https://api.api-engagement.beta.gouv.fr", apiUrl.replace(/\/+$/, ""));
        if (envName) content = content.replace(/^\/\* (jstag v\d+)/, `/* $1 - ${envName}`);
        fs.writeFileSync(file, content);
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
