import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
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
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
