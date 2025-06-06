import { describe, expect, it } from "vitest";
import * as utils from "../utils";

describe("rateLimit", () => {
  it("waits at least the specified delay", async () => {
    const start = Date.now();
    await utils.rateLimit(100);
    expect(Date.now() - start).toBeGreaterThanOrEqual(100);
  });
});
