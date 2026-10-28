import type { MetaDescriptor } from "react-router";

export const SITE_URL = "https://trouvetamission.gouv.fr";
const SITE_NAME = "Trouve ta mission";
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const OG_IMAGE_ALT = "Trouve ta mission : tous les engagements publics réunis en un seul endroit";

type PageMetaOptions = {
  title: string;
  description?: string;
  // Valeurs d'aperçu de partage quand elles diffèrent du title / de la description de la page.
  ogTitle?: string;
  ogDescription?: string;
  // Consigne robots : la page n'est alors pas déclarée indexable, donc sans canonical.
  robots?: string;
};

// Une route qui exporte meta() remplace celui de la racine : chaque page reprend donc ce socle (image, nom du site, URL).
export function pageMeta({ pathname }: { pathname: string }, { title, description, ogTitle, ogDescription, robots }: PageMetaOptions): MetaDescriptor[] {
  const url = `${SITE_URL}${pathname}`;
  const shareDescription = ogDescription ?? description;
  return [
    { title },
    ...(description ? [{ name: "description", content: description }] : []),
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "fr_FR" },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    // Adresse officielle : absolue, sans paramètre ni www (location.pathname exclut la query string).
    ...(robots ? [{ name: "robots", content: robots }] : [{ tagName: "link", rel: "canonical", href: url }]),
    { property: "og:title", content: ogTitle ?? title },
    ...(shareDescription ? [{ property: "og:description", content: shareDescription }] : []),
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: OG_IMAGE_ALT },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: OG_IMAGE },
    { name: "twitter:image:alt", content: OG_IMAGE_ALT },
  ];
}
