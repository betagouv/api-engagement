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
    app.customFields.register({
      name: "pictogram",
      type: "string",
      intlLabel: { id: "pictogram.label", defaultMessage: "Pictogramme DSFR" },
      intlDescription: { id: "pictogram.description", defaultMessage: "Pictogramme DSFR avec recherche" },
      components: { Input: async () => ({ default: (await import("./components/pictogram-input")).default as never }) },
    });
    app.addMenuLink({
      to: "cms-components",
      icon: Layout,
      intlLabel: { id: "cms-components.menu", defaultMessage: "Composants du CMS" },
      Component: () => import("./pages/cms-components"),
      permissions: [],
    });
  },
  bootstrap(app: StrapiApp) {
    // Les zones défilantes (listes déroulantes…) utilisent une scrollbar Radix fine, claire et visible au survol seulement : on remet la scrollbar native, toujours visible.
    const style = document.createElement("style");
    style.textContent = `
      [data-radix-scroll-area-viewport] { scrollbar-width: thin !important; scrollbar-color: #666687 #dcdce4; }
      [data-radix-scroll-area-viewport]::-webkit-scrollbar { display: block !important; width: 10px; }
      [data-radix-scroll-area-viewport]::-webkit-scrollbar-track { background: #dcdce4; }
      [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb { background: #666687; border-radius: 5px; }
      [data-radix-scroll-area-viewport] ~ [data-orientation] { display: none !important; }
    `;
    document.head.append(style);
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
