import { Layout } from "@strapi/icons";
import type { StrapiApp } from "@strapi/strapi/admin";

// Personnalisation de l'admin : lien « Composants du CMS » dans le menu, vers la page rendue par plateform.
export default {
  config: {
    locales: [],
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
  // Bandeau pré-prod (comme app/) : fixé en haut, l'admin est décalé de sa hauteur.
  async bootstrap() {
    try {
      const { env } = await (await fetch("/api/environment")).json();
      if (env !== "staging") {
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
    } catch {
      // Bandeau purement informatif : on ignore l'échec.
    }
  },
};
