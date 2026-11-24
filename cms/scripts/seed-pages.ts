// Seed de dev (jamais en production) : recrée les pages décrites en JSON dans `seed/pages/` (un fichier par page).
// Séparé de `seed.ts` (jeton de lecture de plateform, déjà lancé sur les environnements). Idempotent : relancer remplace les pages concernées.
// Usage : `docker compose exec cms npm run seed:pages` (toutes les pages) ou `npm run seed:pages -- <slug>` (une seule page).
// Un média s'écrit `{ "upload": "chemin/image.webp", "alternativeText": "…" }`, chemin relatif à `seed/images/`.
import fs from "node:fs";
import path from "node:path";

import { compileStrapi, createStrapi, type Core } from "@strapi/strapi";
import mime from "mime-types";

const PAGES = path.join(process.cwd(), "seed", "pages");
const IMAGES = path.join(process.cwd(), "seed", "images");
const UID = "api::page.page";

type Upload = { upload: string; alternativeText?: string };
type SeedPage = Record<string, unknown> & { slug: string };

const uploadImage = async (strapi: Core.Strapi, { upload, alternativeText = "" }: Upload): Promise<number> => {
  const filepath = path.join(IMAGES, upload);
  const name = path.basename(filepath);
  const existing = await strapi.db.query("plugin::upload.file").findOne({ where: { name } });
  // Média déjà en base mais fichier absent de public/uploads (dossier vidé, base reprise…) : on le renvoie.
  const fileOnDisk = existing && fs.existsSync(path.join(process.cwd(), "public", existing.url));
  if (existing && fileOnDisk) {
    if (alternativeText) {
      await strapi.db.query("plugin::upload.file").update({ where: { id: existing.id }, data: { alternativeText } });
    }
    return existing.id;
  }
  if (existing) {
    await strapi.db.query("plugin::upload.file").delete({ where: { id: existing.id } });
  }

  const [file] = await strapi
    .plugin("upload")
    .service("upload")
    .upload({
      data: { fileInfo: { name, alternativeText } },
      files: { filepath, originalFilename: name, mimetype: mime.lookup(filepath) || "application/octet-stream", size: fs.statSync(filepath).size },
    });
  return file.id;
};

// Remplace chaque `{ "upload": … }` du JSON par l'id du média envoyé. Séquentiel : une même image (ex. un logo)
// réutilisée dans la page n'est envoyée qu'une fois.
const resolveUploads = async (strapi: Core.Strapi, value: unknown): Promise<unknown> => {
  if (Array.isArray(value)) {
    const items = [];
    for (const item of value) {
      items.push(await resolveUploads(strapi, item));
    }
    return items;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if ("upload" in value) {
    return uploadImage(strapi, value as Upload);
  }

  const resolved: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    resolved[key] = await resolveUploads(strapi, child);
  }
  return resolved;
};

const savePage = async (strapi: Core.Strapi, page: SeedPage) => {
  const documents = strapi.documents(UID);
  for (const old of await documents.findMany({ filters: { slug: page.slug } })) {
    await documents.delete({ documentId: old.documentId });
  }
  const data = await resolveUploads(strapi, page);
  // Le typage généré des zones dynamiques est trop strict pour ce seed : Strapi valide le contenu à l'exécution.
  await documents.create({ status: "published", data: data as never });
  console.log(`Page « ${page.slug} » créée.`);
};

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Le seed est réservé au développement local.");
  }

  const onlySlug = process.argv[2];
  const files = fs.readdirSync(PAGES).filter((file) => file.endsWith(".json"));
  const pages: SeedPage[] = files.map((file) => JSON.parse(fs.readFileSync(path.join(PAGES, file), "utf8")));
  const selectedPages = onlySlug ? pages.filter((page) => page.slug === onlySlug) : pages;
  if (onlySlug && selectedPages.length === 0) {
    throw new Error(`Aucune page « ${onlySlug} » dans seed/pages/.`);
  }

  const app = await createStrapi(await compileStrapi()).load();
  app.log.level = "error";

  for (const page of selectedPages) {
    await savePage(app, page);
  }

  await app.destroy();
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
