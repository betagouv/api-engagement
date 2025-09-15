import { describe, expect, it } from "vitest";
import { findLetudiantPublicId } from "../handler";
import { Mission } from "../../../types";

describe("Letudiant handler utils", () => {
  it("should return existing id with new localisation key", () => {
    const mission = {
      letudiantPublicId: { "Lyon, Rhône, France": "id-123" },
      remote: "no",
    } as unknown as Mission;
    const result = findLetudiantPublicId(mission as any, "Lyon, Rhône, France");
    expect(result).toBe("id-123");
  });

  it("should fallback to legacy city key", () => {
    const mission = {
      letudiantPublicId: { Lyon: "id-legacy" },
      remote: "no",
    } as unknown as Mission;
    const result = findLetudiantPublicId(mission as any, "Lyon, Rhône, France");
    expect(result).toBe("id-legacy");
  });

  it("should not fallback for remote missions", () => {
    const mission = {
      letudiantPublicId: { "A distance": "id-remote" },
      remote: "full",
    } as unknown as Mission;
    const result = findLetudiantPublicId(mission as any, "A distance");
    expect(result).toBe("id-remote");
  });
});
