import { factories } from "@strapi/strapi";

const PAGE_UID = "api::page.page";

// Table complète { fromSlug, toSlug } lue par plateform : toSlug = slug publié de la page (une redirection vers une page
// non publiée est omise, l'ancienne URL reste en 404). Petite table, pas de pagination.
export default factories.createCoreController("api::page-redirect.page-redirect", ({ strapi }) => ({
  async find() {
    const redirects = await strapi.documents("api::page-redirect.page-redirect").findMany({ limit: -1 });
    const pages = await strapi.documents(PAGE_UID).findMany({
      status: "published",
      filters: { documentId: { $in: [...new Set(redirects.map((r) => r.pageDocumentId as string))] } },
      fields: ["slug"],
      limit: -1,
    });
    const slugByDocument = new Map(pages.map((page) => [page.documentId, page.slug as string]));
    return {
      data: redirects.flatMap((r) => {
        const toSlug = slugByDocument.get(r.pageDocumentId as string);
        return toSlug ? [{ fromSlug: r.fromSlug as string, toSlug }] : [];
      }),
    };
  },
}));
