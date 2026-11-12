// Envoie les pages de `seed/pages/` vers un CMS déployé (staging, production) par son API REST, sans accès à la base.
// Usage : `docker compose exec -T -e CMS_REMOTE_URL=https://… -e CMS_REMOTE_TOKEN=… cms npm run seed:remote -- <slug> [--replace]`
// Jeton : Settings → API Tokens → type « Full access », à supprimer après usage.
// Sans `--replace`, une page dont le slug existe déjà est laissée telle quelle (elle a pu être modifiée dans l'admin).
// Les images sont réutilisées si un média du même nom existe déjà dans la médiathèque.
import fs from "node:fs";
import path from "node:path";

import mime from "mime-types";

const PAGES = path.join(process.cwd(), "seed", "pages");
const IMAGES = path.join(process.cwd(), "seed", "images");

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
  return response.status === 204 ? (undefined as T) : response.json();
};

const uploadImage = async ({ upload, alternativeText = "" }: Upload): Promise<number> => {
  const filepath = path.join(IMAGES, upload);
  const name = path.basename(filepath);
  const existing = await request<Array<{ id: number }>>(`/api/upload/files?filters[name][$eq]=${encodeURIComponent(name)}`);
  if (existing.length > 0) {
    return existing[0].id;
  }

  const form = new FormData();
  const file = new Blob([fs.readFileSync(filepath)], { type: mime.lookup(filepath) || "application/octet-stream" });
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
  const slugs = args.filter((arg) => arg !== "--replace");
  if (slugs.length === 0) {
    throw new Error("Indiquer au moins un slug (ex. `npm run seed:remote -- sport`).");
  }

  for (const slug of slugs) {
    const file = path.join(PAGES, `${slug}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Aucune page « ${slug} » dans seed/pages/.`);
    }
    const page: SeedPage = JSON.parse(fs.readFileSync(file, "utf8"));
    await savePage(page, replace);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
