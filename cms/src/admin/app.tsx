import { Layout } from "@strapi/icons";
import type { StrapiApp } from "@strapi/strapi/admin";

// Personnalisation de l'admin : lien « Catalogue des blocs » dans le menu, vers le catalogue rendu par plateform.
export default {
  config: {
    locales: [],
  },
  register(app: StrapiApp) {
    app.addMenuLink({
      to: "catalogue-blocs",
      icon: Layout,
      intlLabel: { id: "catalogue-blocs.menu", defaultMessage: "Catalogue des blocs" },
      Component: () => import("./pages/catalogue-blocs"),
      permissions: [],
    });
  },
  bootstrap() {},
};
