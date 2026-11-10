import type { Core } from "@strapi/strapi";

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  // Les types Strapi exigent des champs séparés : on décompose la chaîne de connexion unique.
  const url = new URL(env("DATABASE_URL", "postgres://strapi:strapi@postgres-cms:5432/strapi"));
  return {
    connection: {
      client: "postgres",
      connection: {
        host: url.hostname,
        port: Number(url.port) || 5432,
        database: decodeURIComponent(url.pathname.slice(1)),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        ssl: env.bool("DATABASE_SSL", false) ? { rejectUnauthorized: env.bool("DATABASE_SSL_REJECT_UNAUTHORIZED", true) } : false,
      },
    },
  };
};
