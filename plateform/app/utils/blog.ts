import { BLOG_URL } from "~/utils/cms-urls";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Paramètres de la liste issus de l'URL : page bornée, catégorie seulement si c'est un slug valide.
export function parseBlogQuery(searchParams: URLSearchParams): { page: number; category?: string } {
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const category = searchParams.get("categorie") ?? "";
  return { page: Number.isFinite(page) ? Math.min(Math.max(page, 1), 1000) : 1, category: category.length <= 80 && SLUG.test(category) ? category : undefined };
}

// Adresse de la liste (la page 1 n'a pas de paramètre `page`).
export function blogListUrl({ page = 1, category }: { page?: number; category?: string | null } = {}): string {
  const params = new URLSearchParams();
  if (category) params.set("categorie", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${BLOG_URL}?${query}` : BLOG_URL;
}

// Date éditoriale (AAAA-MM-JJ) en français. Fuseau UTC : une date seule ne doit pas glisser d'un jour selon le serveur.
export function formatArticleDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date));
}
