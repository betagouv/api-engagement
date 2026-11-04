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

  // jstag.js est servi par chaque environnement (prod, staging, bac à sable) : les placeholders __API_URL__
  // (hôte des événements) et __ENV__ (en-tête) sont remplacés par VITE_API_URL et VITE_ENV, au build comme en dev.
  const { VITE_API_URL, VITE_ENV } = loadEnv(env.mode, process.cwd(), "VITE_");
  const renderJstag = (content) =>
    content.replaceAll("__API_URL__", (VITE_API_URL || "https://api.api-engagement.beta.gouv.fr").replace(/\/+$/, "")).replaceAll("__ENV__", VITE_ENV || "development");
  const jstagFile = path.resolve(__dirname, "public/jstag.js");
  plugins.push({
    name: "jstag-environment",
    configureServer(server) {
      server.middlewares.use("/jstag.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.end(renderJstag(fs.readFileSync(jstagFile, "utf8")));
      });
    },
    closeBundle() {
      if (env.command !== "build") return;
      const file = path.resolve(__dirname, "dist/jstag.js");
      fs.writeFileSync(file, renderJstag(fs.readFileSync(file, "utf8")));
    },
  });

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
