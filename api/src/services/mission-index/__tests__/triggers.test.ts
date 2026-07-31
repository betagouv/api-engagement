import { describe, expect, it } from "vitest";

import { changesRequireIndex } from "@/services/mission-index/triggers";

describe("changesRequireIndex", () => {
  it.each(["duration", "startAt", "closeToTransport", "addresses"])("triggers when %s changes", (field) => {
    expect(changesRequireIndex({ [field]: { previous: null, current: "updated" } })).toBe(true);
  });

  it("does not trigger on a field absent from the index", () => {
    expect(changesRequireIndex({ places: { previous: 1, current: 2 } })).toBe(false);
  });
});
