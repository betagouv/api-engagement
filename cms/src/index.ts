import type { Core } from "@strapi/strapi";
import { registerPageHistory } from "./history";

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerPageHistory(strapi);
  },
};
