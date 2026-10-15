import type { MissionBrowseFilters, MissionBrowseSlot, MissionBrowseTaxonomyParams } from "@engagement/dto";

// Filtres proposables sur la liste de missions d'une landing. La clé est aussi le param d'URL et la clé
// de taxonomie ; `departmentCode` est renvoyé par l'API sous la facette `departmentCodes`.
export type LandingFilterKey = "departmentCode" | "tranche_age" | "activite" | "domaine_engagement" | "dispositif";

// Réglage de la liste de missions propre à chaque landing.
export type LandingMissionsConfig = {
  // Missions masquées partout : résultats, pages suivantes et compteurs des filtres.
  exclude?: MissionBrowseTaxonomyParams;
  // Avec une localisation choisie, garde aussi les missions à distance ou sans lieu précis (ex. réserves).
  includeRemote?: boolean;
  // Filtres affichés, dans l'ordre.
  filters: LandingFilterKey[];
  // Emplacements des premiers résultats, appliqués par l'API tant qu'aucun filtre n'est coché.
  slots?: MissionBrowseSlot[];
};

export const LANDING_MISSIONS_PAGE_SIZE = 10;

// Filtres à choix unique : un seul param d'URL est pris en compte.
export const SINGLE_CHOICE_FILTERS: LandingFilterKey[] = ["tranche_age"];

export const getPage = (searchParams: URLSearchParams): number => {
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  return Number.isNaN(page) ? 1 : Math.max(1, page);
};

export const getSelectedValues = (searchParams: URLSearchParams, key: LandingFilterKey): string[] => {
  const values = searchParams.getAll(key);
  return SINGLE_CHOICE_FILTERS.includes(key) ? values.slice(0, 1) : values;
};

// Paramètres de `/missions/browse` pour une landing : seuls les filtres affichés sont lus dans l'URL,
// la liste est toujours triée par date (les emplacements ne s'appliquent que sans filtre, côté API).
export const buildLandingBrowseFilters = (searchParams: URLSearchParams, config: LandingMissionsConfig): MissionBrowseFilters => {
  const filters: MissionBrowseFilters = {
    page: getPage(searchParams),
    pageSize: LANDING_MISSIONS_PAGE_SIZE,
    sort: "recent",
    exclude: config.exclude,
    includeRemote: config.includeRemote,
    slots: config.slots,
  };
  for (const key of config.filters) {
    const values = getSelectedValues(searchParams, key);
    if (values.length) filters[key] = values;
  }
  return filters;
};

// Code département (format de la taxonomie : "01", "2A", "971"…) déduit d'un code postal français.
// La Corse se découpe par code postal : 200xx–201xx pour la Corse-du-Sud, 202xx–206xx pour la Haute-Corse.
export const getDepartmentCodeFromPostcode = (postcode: string): string | null => {
  if (!/^\d{5}$/.test(postcode)) return null;
  if (postcode.startsWith("20")) return Number(postcode) < 20200 ? "2A" : "2B";
  if (postcode.startsWith("97") || postcode.startsWith("98")) return postcode.slice(0, 3);
  return postcode.slice(0, 2);
};
