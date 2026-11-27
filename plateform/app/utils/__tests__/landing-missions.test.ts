import { describe, expect, it } from "vitest";

import {
  buildLandingBrowseFilters,
  getDiversitySlots,
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

  it("n'envoie pas les emplacements avec un filtre coché ou une localisation", () => {
    expect(buildLandingBrowseFilters(new URLSearchParams("activite=secourir_proteger"), CONFIG).slots).toBeUndefined();
    expect(buildLandingBrowseFilters(new URLSearchParams("lat=47.2184&lon=-1.5536"), CONFIG).slots).toBeUndefined();
  });

  it("transmet le point de la recherche par localisation", () => {
    const filters = buildLandingBrowseFilters(new URLSearchParams("departmentCode=44&lat=47.2184&lon=-1.5536"), CONFIG);

    expect(filters).toMatchObject({ departmentCode: ["44"], lat: 47.2184, lon: -1.5536 });
  });

  it("ignore un point incomplet ou invalide", () => {
    expect(buildLandingBrowseFilters(new URLSearchParams("lat=47.2184"), CONFIG).lat).toBeUndefined();
    expect(buildLandingBrowseFilters(new URLSearchParams("lat=abc&lon=-1.5536"), CONFIG).lat).toBeUndefined();
  });

  it("garde plusieurs tranches d'âge", () => {
    const filters = buildLandingBrowseFilters(new URLSearchParams("tranche_age=18_25_ans&tranche_age=26_30_ans"), CONFIG);

    expect(filters.tranche_age).toEqual(["18_25_ans", "26_30_ans"]);
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
  it("avec la sécurité en tête, restreint les seuls emplacements bénévolat et Service Civique, pas la liste", () => {
    const { slots, include } = getLandingMissionsConfig({ securiteEnTete: true });
    for (const slot of slots ?? []) {
      expect(!!slot.anyOf).toBe(["benevolat", "service_civique"].includes(String(slot.filters.dispositif)));
    }
    expect(include).toEqual({});
    expect(getLandingMissionsConfig({}).slots?.some((slot) => slot.anyOf)).toBe(false);
  });

  it("n'active la carte d'alertes que si le bloc la demande, avec une mission de moins en première page", () => {
    expect(getLandingMissionsConfig({}).alertCard).toBe(false);
    expect(buildLandingBrowseFilters(new URLSearchParams(), getLandingMissionsConfig({ alertCard: true })).pageSize).toBe(11);
  });

  it("fait du dispositif choisi le périmètre de la page et masque son filtre", () => {
    const config = getLandingMissionsConfig({ dispositifs: ["reserve_armees"] });
    expect(config.include).toEqual({ dispositif: ["reserve_armees"] });
    expect(config.filters).toEqual(["departmentCode", "tranche_age", "type_mission", "activite", "domaine_engagement"]);
  });

  it("ne garde que les emplacements des dispositifs du périmètre", () => {
    const slots = getLandingMissionsConfig({ dispositifs: ["service_civique", "reserve_armees", "sapeurs_pompiers", "reserve_gendarmerie"] }).slots;

    expect(slots?.map((slot) => slot.filters.dispositif?.[0])).toEqual([
      "service_civique",
      "reserve_armees",
      "sapeurs_pompiers",
      "service_civique",
      "reserve_gendarmerie",
      "reserve_armees",
    ]);
  });

  it("réserve un emplacement à chaque dispositif sans périmètre", () => {
    expect(new Set(getDiversitySlots().map((slot) => slot.filters.dispositif?.[0])).size).toBe(6);
  });

  it("garde le filtre d'un critère à plusieurs valeurs, sans sortir du périmètre", () => {
    const config = getLandingMissionsConfig({ dispositifs: ["benevolat", "service_civique"] });

    expect(config.filters).toContain("dispositif");
    expect(buildLandingBrowseFilters(new URLSearchParams("dispositif=service_civique&dispositif=reserve_armees"), config).dispositif).toEqual(["service_civique"]);

    const outOfScope = buildLandingBrowseFilters(new URLSearchParams("dispositif=reserve_armees"), config);
    expect(outOfScope.dispositif).toEqual(["benevolat", "service_civique"]);
    expect(outOfScope.slots).toEqual(config.slots);
  });

  it("applique toujours le périmètre, même si l'URL demande autre chose", () => {
    const config = getLandingMissionsConfig({ domainesEngagement: ["environnement_animaux"] });
    const filters = buildLandingBrowseFilters(new URLSearchParams("domaine_engagement=sport&dispositif=benevolat"), config);
    expect(filters.domaine_engagement).toEqual(["environnement_animaux"]);
    expect(filters.dispositif).toEqual(["benevolat"]);
    expect(filters.includeRemote).toBe(true);
  });

  it("propose tous les filtres sans périmètre", () => {
    expect(getLandingMissionsConfig({}).filters).toHaveLength(6);
  });
  it("transforme les listes du bloc en périmètre et masque les filtres à une seule valeur", () => {
    const config = getLandingMissionsConfig({ dispositifs: ["benevolat", "service_civique"], domainesEngagement: ["sport"], departements: null });

    expect(config.include).toEqual({ dispositif: ["benevolat", "service_civique"], domaine_engagement: ["sport"] });
    expect(config.filters).toEqual(["departmentCode", "tranche_age", "type_mission", "activite", "dispositif"]);
    expect(config.includeRemote).toBe(true);
  });

  it("limite aux départements choisis, sans missions à distance, et masque la localisation", () => {
    const config = getLandingMissionsConfig({ departements: ["29", "56"] });

    expect(config.include).toEqual({ departmentCode: ["29", "56"] });
    expect(config.filters).not.toContain("departmentCode");
    expect(config.includeRemote).toBe(false);
    expect(buildLandingBrowseFilters(new URLSearchParams("departmentCode=75"), config).departmentCode).toEqual(["29", "56"]);
  });

  it("traite une liste vide comme aucune restriction", () => {
    expect(getLandingMissionsConfig({ dispositifs: [], domainesEngagement: null, departements: undefined }).include).toEqual({});
  });
});
