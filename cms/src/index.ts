import type { Core } from "@strapi/strapi";
import { registerPageHistory } from "./history";

// Types de plugins à masquer du menu « Content Manager » (users gérés par les settings admin, verrous d'édition internes).
const HIDDEN_CONTENT_TYPES = ["plugin::users-permissions.user", "plugin::record-locking.open-entity"];

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerPageHistory(strapi);
    strapi.customFields.register({ name: "pictogram", type: "string" });
    for (const uid of HIDDEN_CONTENT_TYPES) {
      const contentType = strapi.contentType(uid as never) as { pluginOptions?: Record<string, unknown> } | undefined;
      if (contentType) {
        contentType.pluginOptions = { ...contentType.pluginOptions, "content-manager": { visible: false } };
      }
    }
  },
};
