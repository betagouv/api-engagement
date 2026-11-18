import type { Core } from "@strapi/strapi";
import { isDeepStrictEqual } from "node:util";

const PAGE_UID = "api::page.page";
const VERSION_UID = "api::page-version.page-version";
const ACTIONS = ["create", "update", "publish"];
// Versions conservées par page.
const MAX_VERSIONS = 50;

type PopulateBuilder = (uid: string) => { populateDeep: (level: number) => { build: () => Promise<object> } };

// Retire ce que Strapi regénère à la restauration : ids des composants (les médias, repérés par `mime`, gardent le leur) et métadonnées.
const clean = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(clean);
  }
  if (value && typeof value === "object") {
    const isMedia = "mime" in value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => isMedia || key !== "id")
        .map(([key, v]) => [key, isMedia ? v : clean(v)])
    );
  }
  return value;
};

// Historise le brouillon de chaque page à chaque création, enregistrement ou publication (middleware du Document Service).
export const registerPageHistory = (strapi: Core.Strapi) => {
  strapi.documents.use(async (context, next) => {
    const result = await next();
    if (context.uid !== PAGE_UID || !ACTIONS.includes(context.action)) {
      return result;
    }
    try {
      const documentId = (result as { documentId?: string } | undefined)?.documentId ?? (context.params as { documentId?: string }).documentId;
      if (documentId) {
        await saveVersion(strapi, documentId, context.action);
      }
    } catch (error) {
      // L'historique ne doit jamais faire échouer une sauvegarde.
      strapi.log.error(`[page-history] ${error instanceof Error ? error.message : error}`);
    }
    return result;
  });
};

const saveVersion = async (strapi: Core.Strapi, documentId: string, action: string) => {
  const populateBuilder = strapi.plugin("content-manager").service("populate-builder") as unknown as PopulateBuilder;
  const populate = await populateBuilder(PAGE_UID).populateDeep(Infinity).build();
  const page = await strapi.documents(PAGE_UID).findOne({ documentId, status: "draft", populate: populate as never });
  if (!page) {
    return;
  }
  const { id, documentId: _documentId, createdAt, updatedAt, publishedAt, createdBy, updatedBy, locale, localizations, ...content } = page as Record<string, unknown>;
  const snapshot = clean(content) as Record<string, unknown>;

  const versions = strapi.documents(VERSION_UID);
  const [last] = await versions.findMany({ filters: { pageDocumentId: documentId }, sort: "createdAt:desc", limit: 1 });
  // Pas de doublon : une publication sans changement depuis le dernier enregistrement reste tracée, un enregistrement identique non.
  if (last && isDeepStrictEqual(last.snapshot, snapshot) && !(action === "publish" && last.action !== "publish")) {
    return;
  }

  const user = strapi.requestContext.get()?.state?.user as { firstname?: string; lastname?: string; email?: string } | undefined;
  const author = user ? [user.firstname, user.lastname].filter(Boolean).join(" ") || user.email : null;
  await versions.create({ data: { pageDocumentId: documentId, title: String(snapshot.title ?? ""), action, author, snapshot } as never });

  const old = await versions.findMany({ filters: { pageDocumentId: documentId }, sort: "createdAt:desc", start: MAX_VERSIONS, fields: ["documentId"] });
  await Promise.all(old.map((version) => versions.delete({ documentId: version.documentId })));
};
