import { describe, expect, it } from "vitest";

import { buildLandingBrowseFilters, getDepartmentCodeFromPostcode, getPage, type LandingMissionsConfig } from "~/utils/landing-missions";

const CONFIG: LandingMissionsConfig = {
  exclude: { dispositif: ["reserve_police_nationale"] },
  filters: ["departmentCode", "tranche_age", "activite"],
  slots: [{ filters: { dispositif: ["reserve_armees"] } }],
};

describe("buildLandingBrowseFilters", () => {
  it("transmet toujours l'exclusion, les emplacements et le tri par date", () => {
    expect(buildLandingBrowseFilters(new URLSearchParams(), CONFIG)).toEqual({
      page: 1,
      pageSize: 10,
      sort: "recent",
      exclude: { dispositif: ["reserve_police_nationale"] },
      slots: [{ filters: { dispositif: ["reserve_armees"] } }],
    });
  });

  it("ne lit dans l'URL que les filtres affichés par la landing", () => {
    const filters = buildLandingBrowseFilters(new URLSearchParams("activite=secourir_proteger&activite=aider_accompagner&dispositif=reserve_police_nationale"), CONFIG);

    expect(filters.activite).toEqual(["secourir_proteger", "aider_accompagner"]);
    expect(filters.dispositif).toBeUndefined();
  });

  it("ne garde qu'une tranche d'âge", () => {
    const filters = buildLandingBrowseFilters(new URLSearchParams("tranche_age=18_25_ans&tranche_age=26_30_ans"), CONFIG);

    expect(filters.tranche_age).toEqual(["18_25_ans"]);
  });
});

describe("getPage", () => {
  it("retombe sur la page 1 pour une valeur absente ou invalide", () => {
    expect(getPage(new URLSearchParams())).toBe(1);
    expect(getPage(new URLSearchParams("page=abc"))).toBe(1);
    expect(getPage(new URLSearchParams("page=-3"))).toBe(1);
    expect(getPage(new URLSearchParams("page=4"))).toBe(4);
  });
});

describe("getDepartmentCodeFromPostcode", () => {
  it("déduit le département d'un code postal de métropole, de Corse et d'outre-mer", () => {
    expect(getDepartmentCodeFromPostcode("01000")).toBe("01");
    expect(getDepartmentCodeFromPostcode("75011")).toBe("75");
    expect(getDepartmentCodeFromPostcode("20000")).toBe("2A");
    expect(getDepartmentCodeFromPostcode("20200")).toBe("2B");
    expect(getDepartmentCodeFromPostcode("97400")).toBe("974");
    expect(getDepartmentCodeFromPostcode("98800")).toBe("988");
  });

  it("ignore un code postal invalide", () => {
    expect(getDepartmentCodeFromPostcode("")).toBeNull();
    expect(getDepartmentCodeFromPostcode("7501")).toBeNull();
  });
});
