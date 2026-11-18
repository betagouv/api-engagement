import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CMS_COMPONENT_EXAMPLES } from "~/config/cms-components";
import { dropIncompleteMedia, getBlockSchema } from "~/services/cms-components.server";

describe("composants du CMS", () => {
  it("donne un exemple à chaque bloc déclaré dans Strapi", () => {
    const strapiBlocks = readdirSync(new URL("../../../../cms/src/components/blocks", import.meta.url)).map((file) => `blocks.${file.replace(".json", "")}`);
    const examples = new Set<string>(CMS_COMPONENT_EXAMPLES.map(({ block }) => block.__component));
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

describe("dropIncompleteMedia (brouillons)", () => {
  const media = { url: "/x.png" };

  it("écarte, d'après les schémas, les blocs et éléments sans média obligatoire", () => {
    const blocks = [
      { __component: "blocks.image", image: null },
      { __component: "blocks.image", image: media },
      {
        __component: "blocks.stories",
        stories: [
          { image: media, logo: null },
          { image: media, logo: media },
        ],
      },
      { __component: "blocks.partners", partners: [{ logo: null }] },
      { __component: "blocks.rich-text", body: [] },
      { __component: "blocks.inconnu" },
    ];
    const result = dropIncompleteMedia(blocks);
    expect(result.map((b) => b.__component)).toEqual(["blocks.image", "blocks.stories", "blocks.partners", "blocks.rich-text", "blocks.inconnu"]);
    expect((result[1] as unknown as { stories: unknown[] }).stories).toHaveLength(1);
    expect((result[2] as unknown as { partners: unknown[] }).partners).toHaveLength(0);
  });

  it("couvre tout média obligatoire déclaré dans Strapi, sans liste à maintenir", () => {
    expect(dropIncompleteMedia([{ __component: "blocks.image", image: undefined }])).toEqual([]);
    expect(dropIncompleteMedia([{ __component: "blocks.testimonials", testimonials: [{ image: null }] }])).toEqual([{ __component: "blocks.testimonials", testimonials: [] }]);
  });
});
