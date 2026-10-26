import { listSitemapEntries } from "~/services/cms.server";
import { SITE_URL } from "~/utils/seo";
import { buildSitemapXml, type SitemapEntry } from "~/utils/sitemap";

// Source unique des pages publiques indexables : ajouter une page ici suffit à la faire apparaître
// dans le sitemap (pas de fichier XML figé à maintenir en parallèle des routes).
// Exclus volontairement : quiz, /results/*, /missions (noindex), fiches mission (/missions/:id, sujet SEO à part) et
// toute URL avec filtres (?domaine_engagement=…).
// lastmod : uniquement une vraie date connue, jamais une date bidon commune à toutes les pages.
const PUBLIC_PAGES: SitemapEntry[] = [
  { path: "/" },
  { path: "/plan-du-site" },
  { path: "/accessibilite" },
  { path: "/mentions-legales" },
  { path: "/politique-de-confidentialite" },
];

// Pages fixes + pages et articles du CMS publiés et indexables (cf. services/cms.server).
export async function loader() {
  const xml = buildSitemapXml(SITE_URL, [...PUBLIC_PAGES, ...(await listSitemapEntries())]);

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
