import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

const PAGE_UID = "api::page.page";
const REDIRECT_UID = "api::page-redirect.page-redirect";

type Params = { documentId?: string; data?: { slug?: string } };

// Slug pris par l'ancienne URL d'une autre page : l'utiliser casserait sa redirection.
const assertNotRedirected = async (strapi: Core.Strapi, slug: string | undefined, documentId: string | undefined) => {
  if (!slug) {
    return;
  }
  const [taken] = await strapi.documents(REDIRECT_UID).findMany({ filters: { fromSlug: slug }, limit: 1 });
  if (taken && taken.pageDocumentId !== documentId) {
    throw new errors.ApplicationError(`« ${slug} » est l'ancienne adresse d'une autre page (redirigée) : choisir un autre slug.`);
  }
};

const publishedSlug = async (strapi: Core.Strapi, documentId: string) =>
  ((await strapi.documents(PAGE_UID).findOne({ documentId, status: "published", fields: ["slug"] })) as { slug?: string } | null)?.slug;

// Garde les anciennes URL d'une page vivantes : à la publication d'un nouveau slug, l'ancien est redirigé (301, côté plateform)
// vers la page. Les redirections pointent le document, pas un slug : après A→B→C, A et B mènent directement à C.
export const registerSlugRedirects = (strapi: Core.Strapi) => {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== PAGE_UID) {
      return next();
    }
    const params = context.params as Params;
    const documentId = params.documentId;

    if (context.action === "create" || context.action === "update") {
      await assertNotRedirected(strapi, params.data?.slug, documentId);
      return next();
    }
    if (context.action === "delete" && documentId) {
      const result = await next();
      const redirects = strapi.documents(REDIRECT_UID);
      const owned = await redirects.findMany({ filters: { pageDocumentId: documentId }, limit: -1 });
      await Promise.all(owned.map((r) => redirects.delete({ documentId: r.documentId })));
      return result;
    }
    // Dépublication : le slug publié disparaît avec la version publiée. On le garde comme redirection (omise tant que la page n'est
    // pas republiée, supprimée si elle reprend ce slug), pour qu'un renommage avant la republication ne casse pas l'ancienne URL.
    if (context.action === "unpublish" && documentId) {
      const before = await publishedSlug(strapi, documentId);
      const result = await next();
      if (before) {
        const redirects = strapi.documents(REDIRECT_UID);
        const stale = await redirects.findMany({ filters: { fromSlug: before }, limit: -1 });
        await Promise.all(stale.map((r) => redirects.delete({ documentId: r.documentId })));
        await redirects.create({ data: { fromSlug: before, pageDocumentId: documentId } as never });
      }
      return result;
    }
    if (context.action !== "publish" || !documentId) {
      return next();
    }

    // Un brouillon peut avoir pris l'ancien slug d'une autre page depuis sa saisie : on revérifie à la publication.
    const draft = (await strapi.documents(PAGE_UID).findOne({ documentId, status: "draft", fields: ["slug"] })) as { slug?: string } | null;
    await assertNotRedirected(strapi, draft?.slug, documentId);

    const before = await publishedSlug(strapi, documentId);
    const result = await next();
    const after = await publishedSlug(strapi, documentId);
    if (after) {
      const redirects = strapi.documents(REDIRECT_UID);
      // Slug repris par sa propre page (A→B→A) : plus de redirection depuis A, sinon boucle.
      const stale = await redirects.findMany({ filters: { fromSlug: after }, limit: -1 });
      await Promise.all(stale.map((r) => redirects.delete({ documentId: r.documentId })));
      if (before && before !== after) {
        await redirects.create({ data: { fromSlug: before, pageDocumentId: documentId } as never });
      }
    }
    return result;
  });
};
