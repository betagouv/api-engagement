import type { Core } from "@strapi/strapi";

// Preview (bouton « Ouvrir l'aperçu » de l'éditeur) : plateform rend le brouillon sur sa vraie URL, protégée par un secret partagé.
const previewConfig = (env: Core.Config.Shared.ConfigParams["env"]): Core.Config.Admin["preview"] => {
  const secret = env("CMS_PREVIEW_SECRET");
  const baseUrl = env("PLATEFORM_URL", "http://localhost:3005");
  return {
    enabled: Boolean(secret),
    config: {
      allowedOrigins: [baseUrl],
      async handler(uid, { documentId, status }) {
        if (uid !== "api::page.page") {
          return null;
        }
        const page = await strapi.documents(uid).findOne({ documentId, status: status === "published" ? "published" : "draft", fields: ["slug"] });
        if (!page?.slug) {
          return null;
        }
        return `${baseUrl}/${page.slug}?preview=${encodeURIComponent(secret!)}`;
      },
    },
  };
};

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: { secret: env("ADMIN_JWT_SECRET")! },
  apiToken: { salt: env("API_TOKEN_SALT")! },
  transfer: { token: { salt: env("TRANSFER_TOKEN_SALT")! } },
  secrets: { encryptionKey: env("ENCRYPTION_KEY")! },
  preview: previewConfig(env),
  flags: {
    nps: env.bool("FLAG_NPS", false),
    promoteEE: env.bool("FLAG_PROMOTE_EE", false),
  },
});
