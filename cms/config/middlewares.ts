import type { Core } from "@strapi/strapi";

// Hôte public du bucket de médias : à autoriser dans la CSP de l'admin (aperçus de la médiathèque).
const bucket = process.env.CMS_MEDIA_BUCKET;
const mediaHost = bucket ? `${bucket}.s3.${process.env.CMS_MEDIA_REGION ?? "fr-par"}.scw.cloud` : null;
const mediaSources = mediaHost ? [`https://${mediaHost}`] : [];

// Catalogue des blocs de plateform, affiché en iframe dans l'admin (cf. src/admin/app.tsx).
const plateformUrl = process.env.PLATEFORM_URL || "http://localhost:3005";

// Liste par défaut, explicite, dont `strapi::security` configurée pour autoriser les médias du bucket et l'iframe plateform.
const config: Core.Config.Middlewares = [
  "strapi::logger",
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": ["'self'", "data:", "blob:", "https://market-assets.strapi.io", ...mediaSources],
          "media-src": ["'self'", "data:", "blob:", ...mediaSources],
          "frame-src": ["'self'", plateformUrl],
        },
      },
    },
  },
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];

export default config;
