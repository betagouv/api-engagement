import type { Core } from "@strapi/strapi";

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  // Derrière le proxy TLS de Scaleway : URL publique et confiance dans `X-Forwarded-*` (cookies `secure` de l'admin).
  url: env("PUBLIC_URL", ""),
  proxy: env.bool("IS_PROXIED", false),
  app: { keys: env.array("APP_KEYS")! },
});
