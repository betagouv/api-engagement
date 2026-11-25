import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::page-redirect.page-redirect", { only: ["find"] });
