import { describe, expect, it } from "vitest";
import { hashString } from "../string";

describe("hashString", () => {
  it("retourne toujours le même hash pour la même chaîne", () => {
    expect(hashString("mission-123")).toBe(hashString("mission-123"));
  });

  it("retourne des hashes distincts pour des chaînes différentes", () => {
    expect(hashString("mission-a")).not.toBe(hashString("mission-b"));
  });
});
