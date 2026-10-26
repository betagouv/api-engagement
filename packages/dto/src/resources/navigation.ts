// Navigation éditée dans le CMS (Strapi, `cms/`). Pour l'instant : une section du pied de page.
// Les schémas Strapi (`cms/src/**`) restent la source de vérité.
export type NavigationLink = {
  label: string;
  // Chemin interne ou adresse externe, utilisé quand aucune page n'est choisie.
  url: string | null;
  newTab: boolean;
  // Page du CMS choisie dans l'admin (absente si dépubliée ou supprimée).
  page: { slug: string } | null;
};

export type Navigation = {
  footerTitle: string | null;
  footerLinks: NavigationLink[];
};
