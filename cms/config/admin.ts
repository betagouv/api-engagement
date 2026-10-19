import type { Core } from "@strapi/strapi";

const LANDING_PAGE_UID = "api::landing-page.landing-page";

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
    // Preview : ouvre la route SSR de plateform qui rend la landing (statut `draft` ou `published`).
    preview: {
      enabled: true,
      config: {
        allowedOrigins: [plateformUrl],
        async handler(uid, { documentId, status }) {
          if (uid !== LANDING_PAGE_UID) {
            return null;
          }

          const page = await strapi.documents(LANDING_PAGE_UID).findOne({ documentId, fields: ["slug"] });
          const params = new URLSearchParams({ preview: env("PREVIEW_SECRET")!, status: status ?? "draft" });
          return `${plateformUrl}/cms/${page?.slug}?${params}`;
        },
      },
    },
  };
};
