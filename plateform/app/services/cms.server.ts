import type { CmsPage } from "~/types/cms";

// Client serveur du CMS (Strapi) : lit les landings depuis les loaders SSR. Jamais importé côté navigateur (`.server`).
// Sans CMS_API_TOKEN, le CMS est considéré comme non configuré (ex. environnement sans CMS) : les landings répondent 404.
const CMS_URL = process.env.CMS_URL || "http://localhost:1337";
// Les médias sont chargés par le navigateur : URL publique du CMS (différente de CMS_URL dans Docker).
const CMS_PUBLIC_URL = process.env.CMS_PUBLIC_URL ?? CMS_URL;
const CMS_API_TOKEN = process.env.CMS_API_TOKEN;

// Cache mémoire des pages publiées : évite un aller-retour CMS par visite et garde la page servie si le CMS est indisponible.
// Seules les pages existantes y entrent (jamais un 404) et sa taille est bornée : le slug vient de l'URL, il ne doit pas
// pouvoir faire grossir la mémoire du serveur.
const CACHE_TTL_MS = 60_000;
export const CMS_CACHE_MAX_ENTRIES = 200;
const cache = new Map<string, { page: CmsPage; at: number }>();

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 80;

// Strapi 5 ne peuple pas les composants imbriqués par défaut : un `populate` explicite par type de bloc.
const POPULATE = [
  "populate[blocks][on][blocks.hero][populate]=*",
  "populate[blocks][on][blocks.rich-text][populate]=*",
  "populate[blocks][on][blocks.image][populate]=*",
  "populate[blocks][on][blocks.missions][populate][slots]=true",
  "populate[blocks][on][blocks.etapes][populate][items]=true",
  "populate[blocks][on][blocks.benefits][populate][benefits]=true",
  "populate[blocks][on][blocks.cards][populate][cards]=true",
  "populate[blocks][on][blocks.stories][populate][stories][populate]=*",
  "populate[blocks][on][blocks.faq][populate][questions]=true",
  "populate[blocks][on][blocks.partners][populate][partners][populate]=*",
].join("&");

// Contenu publié uniquement (pas de brouillon côté plateform).
export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  // Un slug mal formé ne correspond à aucune page : inutile de solliciter le CMS.
  if (!CMS_API_TOKEN || slug.length > SLUG_MAX_LENGTH || !SLUG.test(slug)) return null;

  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.page;

  try {
    const page = await fetchCmsPage(slug);
    // ponytail : pas de cache négatif (un 404 recontacte le CMS), au prix d'une requête de plus par slug inconnu.
    if (page) remember(slug, page);
    return page;
  } catch (error) {
    // CMS indisponible : on resert la dernière version connue plutôt qu'une erreur.
    if (cached) return cached.page;
    throw error;
  }
}

function remember(slug: string, page: CmsPage) {
  // Réinsertion : l'entrée la plus ancienne est toujours en tête de la Map, et c'est elle qu'on évince au-delà de la borne.
  cache.delete(slug);
  cache.set(slug, { page, at: Date.now() });
  if (cache.size > CMS_CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
}

async function fetchCmsPage(slug: string): Promise<CmsPage | null> {
  const query = `filters[slug][$eq]=${encodeURIComponent(slug)}&status=published&${POPULATE}`;
  const response = await fetch(`${CMS_URL}/api/pages?${query}`, {
    headers: { Authorization: `Bearer ${CMS_API_TOKEN}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`CMS indisponible (${response.status})`);

  const { data } = (await response.json()) as { data: CmsPage[] };
  return data[0] ? absolutizeMedia(data[0]) : null;
}

// Les médias sont servis par le CMS : on rend leurs URLs absolues (seuls les `/uploads/` sont concernés).
const absolutizeMedia = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value), (key, v) => (key === "url" && typeof v === "string" && v.startsWith("/uploads/") ? `${CMS_PUBLIC_URL}${v}` : v));
