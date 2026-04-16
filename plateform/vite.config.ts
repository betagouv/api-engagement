import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  ssr: {
    // @codegouvfr/react-dsfr utilise de l'ESM natif.
    // Sans cette option, Vite l'externalise en SSR et Node.js échoue à le résoudre.
    // On force le bundle pour que Vite gère lui-même la résolution des imports.
    noExternal: ["@codegouvfr/react-dsfr", "tsafe"],
  },
});
