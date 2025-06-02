import { describe, expect, it } from "vitest";
import * as utils from "../utils";

describe("isAlreadySynced", () => {
  it("returns true if letudiantPublicId exists", () => {
    expect(utils.isAlreadySynced({ letudiantPublicId: "abc" })).toBe(true);
    expect(utils.isAlreadySynced({ letudiantPublicId: undefined })).toBe(false);
  });
});

describe("rateLimit", () => {
  it("waits at least the specified delay", async () => {
    const start = Date.now();
    await utils.rateLimit(100);
    expect(Date.now() - start).toBeGreaterThanOrEqual(100);
  });
});
