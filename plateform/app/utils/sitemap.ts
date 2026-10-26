export type SitemapEntry = { path: string; lastmod?: string };

const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// Fusionne les entrées (la première occurrence d'un chemin l'emporte) et produit le XML du sitemap.
export function buildSitemapXml(siteUrl: string, entries: SitemapEntry[]): string {
  const byPath = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    if (!byPath.has(entry.path)) byPath.set(entry.path, entry);
  }
  const unique = [...byPath.values()];
  const urls = unique
    .map(({ path, lastmod }) => `  <url>\n    <loc>${escapeXml(`${siteUrl}${path}`)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
