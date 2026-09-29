const SITE_URL = "https://trouvetamission.gouv.fr";

// Source unique des pages publiques indexables : ajouter une page ici suffit à la faire apparaître
// dans le sitemap (pas de fichier XML figé à maintenir en parallèle des routes).
// Exclus volontairement : quiz, /results/*, fiches mission (/missions/:id, sujet SEO à part) et
// toute URL avec filtres (?domaine_engagement=…).
// lastmod : uniquement une vraie date connue, jamais une date bidon commune à toutes les pages.
const PUBLIC_PAGES: { path: string; lastmod?: string }[] = [
  { path: "/" },
  { path: "/missions" },
  { path: "/plan-du-site" },
  { path: "/accessibilite" },
  { path: "/mentions-legales" },
  { path: "/politique-de-confidentialite" },
];

export async function loader() {
  const urls = PUBLIC_PAGES.map(({ path, lastmod }) => `  <url>\n    <loc>${SITE_URL}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
