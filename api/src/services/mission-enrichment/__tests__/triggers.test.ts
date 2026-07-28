import { describe, expect, it } from "vitest";

import { changesRequireEnrichment } from "@/services/mission-enrichment/triggers";

describe("changesRequireEnrichment", () => {
  it("triggers when romeSkills changes", () => {
    expect(changesRequireEnrichment({ romeSkills: { previous: [], current: ["300412"] } })).toBe(true);
  });

  it("triggers when compensationAmount changes", () => {
    expect(changesRequireEnrichment({ compensationAmount: { previous: null, current: 619.83 } })).toBe(true);
  });

  it("does not trigger on a non-prompt field", () => {
    expect(changesRequireEnrichment({ places: { previous: 1, current: 2 } })).toBe(false);
  });
});
