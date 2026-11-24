// Envoie les pages de `seed/pages/` vers un CMS déployé (staging, production) par son API REST, sans accès à la base.
// Usage, depuis `cms/` (sans Docker ni dépendances) : `CMS_REMOTE_URL=https://… CMS_REMOTE_TOKEN=… npm run seed:remote -- [slug…] [--replace]` (ou dans `cms/.env`).
// Sans slug, toutes les pages de `seed/pages/` sont envoyées.
// Jeton : Settings → API Tokens → type « Full access », à supprimer après usage.
// Sans `--replace`, une page dont le slug existe déjà est laissée telle quelle (elle a pu être modifiée dans l'admin).
// Les images sont réutilisées si un média du même nom existe déjà dans la médiathèque.
import fs from "node:fs";
import path from "node:path";

const PAGES = path.join(process.cwd(), "seed", "pages");
const IMAGES = path.join(process.cwd(), "seed", "images");
const MIME_TYPES: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };

const CMS_REMOTE_URL = process.env.CMS_REMOTE_URL?.replace(/\/$/, "");
const CMS_REMOTE_TOKEN = process.env.CMS_REMOTE_TOKEN;

type Upload = { upload: string; alternativeText?: string };
type SeedPage = Record<string, unknown> & { slug: string };

const request = async <T>(pathname: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${CMS_REMOTE_URL}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${CMS_REMOTE_TOKEN}`, ...init.headers },
  });
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${pathname} : ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
};

const uploadImage = async ({ upload, alternativeText = "" }: Upload): Promise<number> => {
  const filepath = path.join(IMAGES, upload);
  const name = path.basename(filepath);
  const existing = await request<Array<{ id: number }>>(`/api/upload/files?filters[name][$eq]=${encodeURIComponent(name)}`);
  if (existing.length > 0) {
    return existing[0].id;
  }

  const form = new FormData();
  const file = new Blob([fs.readFileSync(filepath)], { type: MIME_TYPES[path.extname(filepath).toLowerCase()] ?? "application/octet-stream" });
  form.append("files", file, name);
  form.append("fileInfo", JSON.stringify({ name, alternativeText }));
  const [uploaded] = await request<Array<{ id: number }>>("/api/upload", { method: "POST", body: form });
  console.log(`  Image « ${name} » envoyée.`);
  return uploaded.id;
};

// Remplace chaque `{ "upload": … }` du JSON par l'id du média envoyé, comme `seed-pages.ts`.
const resolveUploads = async (value: unknown): Promise<unknown> => {
  if (Array.isArray(value)) {
    const items = [];
    for (const item of value) {
      items.push(await resolveUploads(item));
    }
    return items;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if ("upload" in value) {
    return uploadImage(value as Upload);
  }

  const resolved: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    resolved[key] = await resolveUploads(child);
  }
  return resolved;
};

// Partenaires de `seed/partners.json` : créés s'ils n'existent pas (un partenaire déjà présent, peut-être retouché dans l'admin, n'est pas modifié),
// puis référencés par nom dans les blocs « Partenaires » des pages.
const seedPartners = async (): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  const partners = JSON.parse(fs.readFileSync(path.join(process.cwd(), "seed", "partners.json"), "utf8")) as Array<Record<string, unknown> & { name: string }>;
  for (const partner of partners) {
    const { data: existing } = await request<{ data: Array<{ documentId: string }> }>(`/api/partners?filters[name][$eq]=${encodeURIComponent(partner.name)}`);
    if (existing.length > 0) {
      ids.set(partner.name, existing[0].documentId);
      continue;
    }
    const data = await resolveUploads(partner);
    const { data: created } = await request<{ data: { documentId: string } }>("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    ids.set(partner.name, created.documentId);
    console.log(`  Partenaire « ${partner.name} » créé.`);
  }
  return ids;
};

const linkPartners = (page: SeedPage, ids: Map<string, string>): SeedPage => ({
  ...page,
  blocks: (page.blocks as Array<Record<string, unknown>>).map((block) =>
    block.__component === "blocks.partners"
      ? {
          ...block,
          partners: (block.partners as string[]).map((name) => {
            const id = ids.get(name);
            if (!id) {
              throw new Error(`Partenaire « ${name} » inconnu (seed/partners.json).`);
            }
            return id;
          }),
        }
      : block
  ),
});

const savePage = async (page: SeedPage, replace: boolean) => {
  // `status=draft` remonte aussi les pages jamais publiées.
  const { data: existingPages } = await request<{ data: Array<{ documentId: string }> }>(`/api/pages?status=draft&filters[slug][$eq]=${encodeURIComponent(page.slug)}`);
  if (existingPages.length > 0 && !replace) {
    console.log(`Page « ${page.slug} » déjà présente : ignorée (relancer avec --replace pour l'écraser).`);
    return;
  }
  for (const existingPage of existingPages) {
    await request(`/api/pages/${existingPage.documentId}`, { method: "DELETE" });
  }

  const data = await resolveUploads(page);
  await request("/api/pages?status=published", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  console.log(`Page « ${page.slug} » ${existingPages.length > 0 ? "remplacée" : "créée"}.`);
};

const main = async () => {
  if (!CMS_REMOTE_URL || !CMS_REMOTE_TOKEN) {
    throw new Error("CMS_REMOTE_URL et CMS_REMOTE_TOKEN sont requis.");
  }

  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const requestedSlugs = args.filter((arg) => arg !== "--replace");
  const allSlugs = fs
    .readdirSync(PAGES)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.basename(file, ".json"));
  const slugs = requestedSlugs.length > 0 ? requestedSlugs : allSlugs;
  console.log(`CMS : ${CMS_REMOTE_URL} — ${slugs.length} page(s)${replace ? ", avec --replace" : ""}.`);

  const partnerIds = await seedPartners();
  for (const slug of slugs) {
    const file = path.join(PAGES, `${slug}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Aucune page « ${slug} » dans seed/pages/.`);
    }
    const page: SeedPage = JSON.parse(fs.readFileSync(file, "utf8"));
    await savePage(linkPartners(page, partnerIds), replace);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
