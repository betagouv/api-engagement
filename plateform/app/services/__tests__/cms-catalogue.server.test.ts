import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CATALOGUE_EXAMPLES } from "~/config/cms-catalogue";
import { getBlockSchema } from "~/services/cms-catalogue.server";

describe("catalogue des blocs du CMS", () => {
  it("donne un exemple à chaque bloc déclaré dans Strapi", () => {
    const strapiBlocks = readdirSync(new URL("../../../../cms/src/components/blocks", import.meta.url)).map((file) => `blocks.${file.replace(".json", "")}`);
    const examples = new Set<string>(CATALOGUE_EXAMPLES.map(({ block }) => block.__component));
    expect(strapiBlocks.filter((uid) => !examples.has(uid))).toEqual([]);
  });

  it("lit les champs du schéma Strapi, composants imbriqués compris", () => {
    const schema = getBlockSchema("blocks.missions");
    expect(schema?.displayName).toBe("Missions");
    const background = schema?.fields.find((field) => field.name === "background");
    expect(background).toMatchObject({ required: true, options: ["creme", "galet"], defaultValue: "galet" });
    const slots = schema?.fields.find((field) => field.name === "slots");
    expect(slots?.children.map((field) => field.name)).toEqual(["dispositif", "domaineEngagement"]);
  });
});
