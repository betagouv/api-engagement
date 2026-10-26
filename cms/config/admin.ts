import type { Core } from "@strapi/strapi";

const PAGE_UID = "api::page.page";
const ARTICLE_UID = "api::article.article";

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => {
  const plateformUrl = env("PLATEFORM_URL", "http://localhost:5173");

  return {
    auth: { secret: env("ADMIN_JWT_SECRET")! },
    apiToken: { salt: env("API_TOKEN_SALT")! },
    transfer: { token: { salt: env("TRANSFER_TOKEN_SALT")! } },
    secrets: { encryptionKey: env("ENCRYPTION_KEY")! },
    flags: {
      nps: env.bool("FLAG_NPS", false),
      promoteEE: env.bool("FLAG_PROMOTE_EE", false),
    },
    // Preview : ouvre la route SSR de plateform qui rend la page ou l'article (statut `draft` ou `published`).
    preview: {
      enabled: true,
      config: {
        allowedOrigins: [plateformUrl],
        async handler(uid, { documentId, status }) {
          let path: string;
          if (uid === PAGE_UID) {
            const page = await strapi.documents(PAGE_UID).findOne({ documentId, fields: ["slug"] });
            path = `/cms/${page?.slug}`;
          } else if (uid === ARTICLE_UID) {
            const article = await strapi.documents(ARTICLE_UID).findOne({ documentId, fields: ["slug"] });
            path = `/blog/${article?.slug}`;
          } else {
            return null;
          }

          const params = new URLSearchParams({ preview: env("PREVIEW_SECRET")!, status: status ?? "draft" });
          return `${plateformUrl}${path}?${params}`;
        },
      },
    },
  };
};
