import { describe, expect, it } from "vitest";

import {
  buildLandingBrowseFilters,
  getLandingMissionsConfig,
  getDepartmentCodeFromPostcode,
  getPage,
  getPageWindow,
  getTotalPages,
  type LandingMissionsConfig,
} from "~/utils/landing-missions";

const CONFIG: LandingMissionsConfig = {
  exclude: { dispositif: ["reserve_police_nationale"] },
  includeRemote: true,
  filters: ["departmentCode", "tranche_age", "activite"],
  slots: [{ filters: { dispositif: ["reserve_armees"] } }],
  alertCard: true,
};

describe("buildLandingBrowseFilters", () => {
  it("transmet toujours l'exclusion, les emplacements et le tri par date", () => {
    expect(buildLandingBrowseFilters(new URLSearchParams(), CONFIG)).toEqual({
      page: 1,
      offset: 0,
      pageSize: 11,
      sort: "recent",
      exclude: { dispositif: ["reserve_police_nationale"] },
      includeRemote: true,
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

  it("affiche 12 missions en page 1 sans carte d'alertes", () => {
    expect(buildLandingBrowseFilters(new URLSearchParams(), { filters: [] })).toMatchObject({ offset: 0, pageSize: 12 });
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

describe("getPageWindow / getTotalPages", () => {
  it("affiche 12 missions par page sans carte d'alertes", () => {
    expect(getPageWindow(1)).toEqual({ offset: 0, pageSize: 12 });
    expect(getPageWindow(2)).toEqual({ offset: 12, pageSize: 12 });
    expect(getTotalPages(12)).toBe(1);
    expect(getTotalPages(13)).toBe(2);
  });

  it("garde 11 missions en page 1 avec la carte d'alertes, puis 12 par page", () => {
    expect(getPageWindow(1, true)).toEqual({ offset: 0, pageSize: 11 });
    expect(getPageWindow(2, true)).toEqual({ offset: 11, pageSize: 12 });
    expect(getPageWindow(3, true)).toEqual({ offset: 23, pageSize: 12 });
  });

  it("compte les pages avec une première page plus courte quand la carte d'alertes est affichée", () => {
    expect(getTotalPages(0, true)).toBe(1);
    expect(getTotalPages(11, true)).toBe(1);
    expect(getTotalPages(12, true)).toBe(2);
    expect(getTotalPages(23, true)).toBe(2);
    expect(getTotalPages(24, true)).toBe(3);
  });
});

describe("getLandingMissionsConfig", () => {
  it("fait du dispositif choisi le périmètre de la page et masque son filtre", () => {
    const config = getLandingMissionsConfig({ dispositif: "reserve_armees", domaineEngagement: null });
    expect(config.include).toEqual({ dispositif: ["reserve_armees"] });
    expect(config.filters).toEqual(["departmentCode", "tranche_age", "type_mission", "activite", "domaine_engagement"]);
  });

  it("applique toujours le périmètre, même si l'URL demande autre chose", () => {
    const config = getLandingMissionsConfig({ dispositif: null, domaineEngagement: "environnement_animaux" });
    const filters = buildLandingBrowseFilters(new URLSearchParams("domaine_engagement=sport&dispositif=benevolat"), config);
    expect(filters.domaine_engagement).toEqual(["environnement_animaux"]);
    expect(filters.dispositif).toEqual(["benevolat"]);
    expect(filters.includeRemote).toBe(true);
  });

  it("propose tous les filtres sans périmètre", () => {
    expect(getLandingMissionsConfig({ dispositif: null, domaineEngagement: null }).filters).toHaveLength(6);
  });
});
