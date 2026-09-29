// Le quiz n'est pas bloqué ici : il porte déjà sa propre consigne noindex (cf. quiz/_layout.tsx),
// et le bloquer via Disallow empêcherait Google de lire cette consigne sur les pages elles-mêmes.
const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: https://trouvetamission.gouv.fr/sitemap.xml
`;

export async function loader() {
  return new Response(ROBOTS_TXT, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
