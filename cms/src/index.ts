import type { Core } from "@strapi/strapi";
import { registerPageHistory } from "./history";
import { registerSlugRedirects } from "./slug-redirects";

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerPageHistory(strapi);
    registerSlugRedirects(strapi);
  },
};
