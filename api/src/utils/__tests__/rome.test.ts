import { describe, expect, it } from "vitest";

import { resolveRomeSkills, resolveRomeSkillsWith } from "@/utils/rome";

const referential = new Map<string, string>([
  ["300412", "Accompagner des personnes"],
  ["300577", "Animer une réunion"],
]);

describe("resolveRomeSkillsWith", () => {
  it("resolves known codes to their labels", () => {
    expect(resolveRomeSkillsWith(["300412", "300577"], referential)).toEqual(["Accompagner des personnes", "Animer une réunion"]);
  });

  it("ignores unknown codes silently", () => {
    expect(resolveRomeSkillsWith(["300412", "999999"], referential)).toEqual(["Accompagner des personnes"]);
  });

  it("trims codes and deduplicates labels while preserving order", () => {
    expect(resolveRomeSkillsWith([" 300577 ", "300412", "300577"], referential)).toEqual(["Animer une réunion", "Accompagner des personnes"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(resolveRomeSkillsWith([], referential)).toEqual([]);
  });
});

describe("resolveRomeSkills", () => {
  it("ignores codes absent from the static referential", () => {
    // Code volontairement absent du référentiel ROME 4.0 : résolution vide quel que soit l'état du snapshot.
    expect(resolveRomeSkills(["__unknown_rome_code__"])).toEqual([]);
  });
});
