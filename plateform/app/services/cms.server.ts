import type { Article, ArticleCategory, ArticleList, ArticleSummary, Navigation, Page } from "@engagement/dto";

import { articleUrl, BLOG_URL, pageUrl } from "~/utils/cms-urls";
import type { SitemapEntry } from "~/utils/sitemap";

// Client serveur du CMS (Strapi) : lit pages, articles et navigation depuis les loaders SSR. Jamais importé côté navigateur (`.server`).
// Sans CMS_API_TOKEN, le CMS est considéré comme non configuré (ex. environnement sans CMS) : les contenus répondent 404.
const CMS_URL = process.env.CMS_URL || "http://localhost:1337";
// Les médias sont chargés par le navigateur : URL publique du CMS (différente de CMS_URL dans Docker).
const CMS_PUBLIC_URL = process.env.CMS_PUBLIC_URL ?? CMS_URL;
const CMS_API_TOKEN = process.env.CMS_API_TOKEN;
const CMS_PREVIEW_SECRET = process.env.CMS_PREVIEW_SECRET;

export const ARTICLES_PAGE_SIZE = 9;

// Cache mémoire du contenu publié : évite un aller-retour CMS par visite et garde le contenu servi si le CMS est indisponible.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 200;
const cache = new Map<string, { value: unknown; at: number }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;

  try {
    const value = await load();
    // Les clés viennent en partie de l'URL (page, catégorie) : on borne la taille du cache.
    if (cache.size >= CACHE_MAX_ENTRIES && !cache.has(key)) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch (error) {
    // CMS indisponible : on resert la dernière version connue plutôt qu'une erreur.
    if (hit) return hit.value as T;
    throw error;
  }
}

class CmsError extends Error {
  constructor(readonly status: number) {
    super(`CMS indisponible (${status})`);
  }
}

async function cmsGet<T>(path: string, query: string): Promise<T> {
  const response = await fetch(`${CMS_URL}/api/${path}?${query}`, {
    headers: { Authorization: `Bearer ${CMS_API_TOKEN}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new CmsError(response.status);
  return absolutizeMedia((await response.json()) as T);
}

// Strapi 5 ne peuple pas les composants imbriqués par défaut : un `populate` explicite par type de bloc.
const BLOCK_POPULATE = {
  hero: "populate[blocks][on][blocks.hero][populate]=*",
  richText: "populate[blocks][on][blocks.rich-text][populate]=*",
  image: "populate[blocks][on][blocks.image][populate]=*",
  missions: "populate[blocks][on][blocks.missions][populate][slots]=true",
  etapes: "populate[blocks][on][blocks.etapes][populate][items]=true",
  benefits: "populate[blocks][on][blocks.benefits][populate][benefits]=true",
  cards: "populate[blocks][on][blocks.cards][populate][cards]=true",
  stories: "populate[blocks][on][blocks.stories][populate][stories][populate]=*",
  faq: "populate[blocks][on][blocks.faq][populate][questions]=true",
  partners: "populate[blocks][on][blocks.partners][populate][partners][populate]=*",
};
const PAGE_POPULATE = Object.values(BLOCK_POPULATE).join("&");
const ARTICLE_POPULATE = ["populate[cover]=true", "populate[category]=true", BLOCK_POPULATE.richText, BLOCK_POPULATE.image, BLOCK_POPULATE.missions].join("&");
const ARTICLE_SUMMARY_POPULATE = "populate[cover]=true&populate[category]=true";

// Preview : l'URL ouverte depuis le CMS porte `?preview=<secret>&status=draft`. Sans secret valide, jamais de brouillon.
export function isCmsPreview(url: URL): boolean {
  return !!CMS_PREVIEW_SECRET && url.searchParams.get("preview") === CMS_PREVIEW_SECRET && url.searchParams.get("status") === "draft";
}

const status = (draft: boolean) => `status=${draft ? "draft" : "published"}`;

export async function getPage(slug: string, { draft }: { draft: boolean }): Promise<Page | null> {
  if (!CMS_API_TOKEN) return null;

  const load = async () => (await cmsGet<{ data: Page[] }>("pages", `filters[slug][$eq]=${encodeURIComponent(slug)}&${status(draft)}&${PAGE_POPULATE}`)).data[0] ?? null;
  // Les brouillons (preview) ne passent jamais par le cache.
  return draft ? load() : cached(`page:${slug}`, load);
}

export async function getArticle(slug: string, { draft }: { draft: boolean }): Promise<Article | null> {
  if (!CMS_API_TOKEN) return null;

  const load = async () => (await cmsGet<{ data: Article[] }>("articles", `filters[slug][$eq]=${encodeURIComponent(slug)}&${status(draft)}&${ARTICLE_POPULATE}`)).data[0] ?? null;
  return draft ? load() : cached(`article:${slug}`, load);
}

export async function listArticles({ page, category }: { page: number; category?: string }): Promise<ArticleList | null> {
  if (!CMS_API_TOKEN) return null;

  const query = [
    status(false),
    "sort=publicationDate:desc",
    `pagination[page]=${page}`,
    `pagination[pageSize]=${ARTICLES_PAGE_SIZE}`,
    ARTICLE_SUMMARY_POPULATE,
    ...(category ? [`filters[category][slug][$eq]=${encodeURIComponent(category)}`] : []),
  ].join("&");

  return cached(`articles:${page}:${category ?? ""}`, async () => {
    const { data, meta } = await cmsGet<{ data: ArticleSummary[]; meta: { pagination: { page: number; pageCount: number } } }>("articles", query);
    return { articles: data, page: meta.pagination.page, pageCount: meta.pagination.pageCount };
  });
}

export async function listCategories(): Promise<ArticleCategory[]> {
  if (!CMS_API_TOKEN) return [];

  return cached("categories", async () => (await cmsGet<{ data: ArticleCategory[] }>("categories", "sort=name:asc&pagination[pageSize]=100")).data);
}

// Jamais bloquant : sans navigation publiée (ou CMS indisponible), le site garde ses menus par défaut.
export async function getNavigation(): Promise<Navigation | null> {
  if (!CMS_API_TOKEN) return null;

  try {
    return await cached("navigation", async () => {
      try {
        return (await cmsGet<{ data: Navigation }>("navigation", `${status(false)}&populate[footerLinks][populate][page][fields][0]=slug`)).data;
      } catch (error) {
        // Single type pas encore créé dans le CMS.
        if (error instanceof CmsError && error.status === 404) return null;
        throw error;
      }
    });
  } catch {
    return null;
  }
}

// Pages et articles publiés et indexables, pour le sitemap. Jamais bloquant : en cas d'échec, le sitemap garde ses pages fixes.
export async function listSitemapEntries(): Promise<SitemapEntry[]> {
  if (!CMS_API_TOKEN) return [];

  try {
    return await cached("sitemap", async () => {
      const [pages, articles] = await Promise.all([fetchIndexable("pages", pageUrl), fetchIndexable("articles", articleUrl)]);
      const latestArticle = articles
        .map((entry) => entry.lastmod)
        .sort()
        .at(-1);
      return [...pages, ...(articles.length ? [{ path: BLOG_URL, lastmod: latestArticle }] : []), ...articles];
    });
  } catch {
    return [];
  }
}

async function fetchIndexable(collection: "pages" | "articles", toPath: (slug: string) => string): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  for (let page = 1, pageCount = 1; page <= pageCount; page++) {
    const query = `${status(false)}&filters[noindex][$eq]=false&fields[0]=slug&fields[1]=updatedAt&pagination[page]=${page}&pagination[pageSize]=100`;
    const { data, meta } = await cmsGet<{ data: { slug: string; updatedAt: string }[]; meta: { pagination: { pageCount: number } } }>(collection, query);
    entries.push(...data.map(({ slug, updatedAt }) => ({ path: toPath(slug), lastmod: updatedAt.slice(0, 10) })));
    pageCount = meta.pagination.pageCount;
  }
  return entries;
}

// Les médias sont servis par le CMS : on rend leurs URLs absolues (seuls les `/uploads/` sont concernés).
const absolutizeMedia = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value), (key, v) => (key === "url" && typeof v === "string" && v.startsWith("/uploads/") ? `${CMS_PUBLIC_URL}${v}` : v));
