import type { Core } from "@strapi/strapi";

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => ({
  connection: {
    client: "postgres",
    connection: {
      host: env("DATABASE_HOST", "postgres-cms"),
      port: env.int("DATABASE_PORT", 5432),
      database: env("DATABASE_NAME", "strapi"),
      user: env("DATABASE_USERNAME", "strapi"),
      password: env("DATABASE_PASSWORD", "strapi"),
      ssl: env.bool("DATABASE_SSL", false) ? { rejectUnauthorized: env.bool("DATABASE_SSL_REJECT_UNAUTHORIZED", true) } : false,
    },
  },
});
