import { Layout } from "@strapi/icons";
import type { StrapiApp } from "@strapi/strapi/admin";
import { BlockDocsPanel } from "./components/block-docs";
import { PageHistoryPanel } from "./components/page-history";

// Personnalisation de l'admin : lien « Composants du CMS » dans le menu, vers la page rendue par plateform.
export default {
  config: {
    locales: ["fr"],
  },
  register(app: StrapiApp) {
    app.addMenuLink({
      to: "cms-components",
      icon: Layout,
      intlLabel: { id: "cms-components.menu", defaultMessage: "Composants du CMS" },
      Component: () => import("./pages/cms-components"),
      permissions: [],
    });
  },
  bootstrap(app: StrapiApp) {
    // Historique des pages : voir src/history.ts.
    (app.getPlugin("content-manager") as unknown as { apis: { addEditViewSidePanel: (actions: unknown[]) => void } }).apis.addEditViewSidePanel([PageHistoryPanel, BlockDocsPanel]);
    // Bandeau pré-prod (comme app/) : fixé en haut, l'admin est décalé de sa hauteur.
    // STRAPI_ADMIN_ENV est inlinée au build (cf. Dockerfile.production, issue de l'ENV global du workflow).
    if (process.env.STRAPI_ADMIN_ENV !== "staging") {
      return;
    }
    const banner = document.createElement("div");
    banner.textContent = "Environnement de pré-prod";
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;height:32px;line-height:32px;z-index:1000;text-align:center;font-size:14px;color:#fff;background:#d63636";
    document.body.prepend(banner);
    const root = document.getElementById("strapi");
    if (root) {
      root.style.cssText = "margin-top:32px;height:calc(100vh - 32px)";
    }
  },
};
