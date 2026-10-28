// Seed de dev : crée une page d'exemple (texte riche et composant missions, sur /cms/exemple-page) et le jeton de lecture
// de plateform. Idempotent : relancer remplace la page. Usage : `npm run seed` dans le conteneur cms.
import { compileStrapi, createStrapi, type Core } from "@strapi/strapi";

const UID = "api::page.page";
const TOKEN_NAME = "plateform (lecture seule)";

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

const text = (value: string, modifiers: Record<string, boolean> = {}) => ({ type: "text", text: value, ...modifiers });

const buildExampleBlocks = () => [
  {
    __component: "blocks.rich-text",
    title: "Des blocs pour composer une page",
    body: [
      { type: "paragraph", children: [text("Une page est composée de blocs : du texte, des images et des composants tout faits, comme la liste de missions ci-dessous.")] },
      { type: "heading", level: 2, children: [text("Un sous-titre")] },
      {
        type: "paragraph",
        children: [
          text("Du texte "),
          text("en gras", { bold: true }),
          text(", "),
          text("en italique", { italic: true }),
          text(", un "),
          { type: "link", url: "/missions", children: [text("lien interne")] },
          text(" ou un "),
          { type: "link", url: "https://www.etalab.gouv.fr", children: [text("lien externe")] },
          text("."),
        ],
      },
      {
        type: "list",
        format: "unordered",
        children: [
          { type: "list-item", children: [text("Un premier point")] },
          { type: "list-item", children: [text("Un second point")] },
        ],
      },
      { type: "quote", children: [text("Une citation mise en avant.")] },
    ],
  },
  {
    __component: "blocks.missions",
    title: "Des ==missions== à découvrir",
    description: "Un composant tout fait, inséré dans une page éditoriale.",
    slots: [],
    fillWithRandom: true,
    examples: false,
    background: "galet",
  },
];

const savePage = async (strapi: Core.Strapi, data: Record<string, unknown> & { slug: string }) => {
  const documents = strapi.documents(UID);
  for (const old of await documents.findMany({ filters: { slug: data.slug } })) {
    await documents.delete({ documentId: old.documentId });
  }
  // Le typage généré des zones dynamiques est trop strict pour ce seed : Strapi valide le contenu à l'exécution.
  await documents.create({ status: "published", data: data as never });
  console.log(`Page « ${data.slug} » créée.`);
};

const main = async () => {
  const app = await createStrapi(await compileStrapi()).load();
  app.log.level = "error";

  const documents = app.documents(UID);
  for (const old of await documents.findMany({ filters: { slug: "exemple-page" } })) {
    await documents.delete({ documentId: old.documentId });
  }
  // Le typage généré des zones dynamiques est trop strict pour ce seed : Strapi valide le contenu à l'exécution.
  await documents.create({
    status: "published",
    data: {
      title: "Exemple de page éditoriale",
      slug: "exemple-page",
      seoTitle: "Exemple de page éditoriale | Trouve ta mission",
      noindex: true,
      blocks: buildExampleBlocks(),
    } as never,
  });
  console.log("Page « exemple-page » créée.");

  await ensureReadToken(app);

  await app.destroy();
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
