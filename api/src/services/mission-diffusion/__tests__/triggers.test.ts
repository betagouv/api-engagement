import { describe, expect, it } from "vitest";

import { changesRequireDiffusion } from "@/services/mission-diffusion/triggers";

describe("changesRequireDiffusion", () => {
  it.each(["publisherId", "publisherOrganizationId", "deletedAt"])("déclenche pour %s", (field) => {
    expect(changesRequireDiffusion({ [field]: { previous: null, current: "value" } })).toBe(true);
  });

  it("ignore les changements sans impact sur le snapshot", () => {
    expect(changesRequireDiffusion({ places: { previous: 1, current: 2 } })).toBe(false);
  });
});
