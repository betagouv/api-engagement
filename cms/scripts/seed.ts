// Seed de dev (jamais en production) : crée le jeton de lecture de plateform et les collections. Les pages viennent de `seed-pages.ts`.
// Idempotent : relancer remplace le jeton et ne crée que les collections manquantes.
// Usage : `docker compose exec cms npm run seed`.
import fs from "node:fs";
import path from "node:path";

import { compileStrapi, createStrapi, type Core } from "@strapi/strapi";

const TOKEN_NAME = "plateform (lecture seule)";
const COLLECTIONS: string[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), "seed", "collections.json"), "utf8"));

// Jeton lecture seule à valeur fixe (CMS_API_TOKEN), pour ne pas avoir à le recopier dans plateform à chaque seed.
// Le hash est calculé par le service Strapi lui-même (`admin::api-token`) ; dev local uniquement.
const ensureReadToken = async (strapi: Core.Strapi) => {
  const accessKey = process.env.CMS_API_TOKEN;
  if (!accessKey) {
    return console.warn("CMS_API_TOKEN absent : jeton non créé.");
  }

  const { hash } = strapi.service("admin::api-token") as unknown as { hash: (accessKey: string) => string };
  const query = strapi.db.query("admin::api-token");
  await query.deleteMany({ where: { name: TOKEN_NAME } });
  await query.create({
    data: {
      name: TOKEN_NAME,
      description: "Lecture du contenu publié et des brouillons (preview).",
      type: "read-only",
      kind: "content-api",
      accessKey: hash(accessKey),
      lifespan: null,
      expiresAt: null,
    },
  });
};

// Pas de suppression : les pages déjà classées gardent leur collection.
const ensureCollections = async (strapi: Core.Strapi) => {
  const collections = strapi.documents("api::collection.collection");
  for (const name of COLLECTIONS) {
    if (!(await collections.findFirst({ filters: { name } }))) {
      await collections.create({ data: { name } });
    }
  }
};

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Le seed est réservé au développement local.");
  }

  const app = await createStrapi(await compileStrapi()).load();
  app.log.level = "error";

  await ensureReadToken(app);
  await ensureCollections(app);

  await app.destroy();
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
