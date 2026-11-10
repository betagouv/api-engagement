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
  bootstrap() {},
};
