import type { Core } from "@strapi/strapi";

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => ({
  connection: {
    client: "postgres",
    connection: {
      connectionString: env("DATABASE_URL", "postgres://strapi:strapi@postgres-cms:5432/strapi"),
      ssl: env.bool("DATABASE_SSL", false) ? { rejectUnauthorized: env.bool("DATABASE_SSL_REJECT_UNAUTHORIZED", true) } : false,
    },
  },
});
