import type { MissionBrowseFilters, MissionBrowseSlot, MissionBrowseTaxonomyParams } from "@engagement/dto";

// Filtres proposables sur la liste de missions d'une landing. La clé est aussi le param d'URL et la clé
// de taxonomie ; `departmentCode` est renvoyé par l'API sous la facette `departmentCodes`.
export type LandingFilterKey = "departmentCode" | "tranche_age" | "activite" | "domaine_engagement" | "dispositif" | "type_mission";

// Réglage de la liste de missions propre à chaque landing.
export type LandingMissionsConfig = {
  // Missions masquées partout : résultats, pages suivantes et compteurs des filtres.
  exclude?: MissionBrowseTaxonomyParams;
  // Périmètre de la page (ex. réserve des armées) : toujours appliqué ; son filtre n'est affiché que s'il reste un choix.
  include?: MissionBrowseTaxonomyParams & { departmentCode?: string[] };
  // Avec une localisation choisie, garde aussi les missions à distance ou sans lieu précis (ex. réserves).
  includeRemote?: boolean;
  // Filtres affichés, dans l'ordre.
  filters: LandingFilterKey[];
  // Emplacements des premiers résultats, envoyés tant que le visiteur n'a coché aucun filtre ni saisi de localisation.
  slots?: MissionBrowseSlot[];
  // Carte d'inscription aux alertes en première page (landing Police uniquement).
  alertCard?: boolean;
};

// 12 cartes par page (des rangées de 2 ou 3 cartes toujours complètes). Avec la carte d'inscription aux alertes,
// la première page n'a que 11 missions pour lui laisser sa place.
export const LANDING_MISSIONS_PAGE_SIZE = 12;

const getFirstPageSize = (alertCard: boolean): number => (alertCard ? LANDING_MISSIONS_PAGE_SIZE - 1 : LANDING_MISSIONS_PAGE_SIZE);

// Position de départ et nombre de missions d'une page.
export const getPageWindow = (page: number, alertCard = false): { offset: number; pageSize: number } => {
  const firstPageSize = getFirstPageSize(alertCard);
  return page === 1 ? { offset: 0, pageSize: firstPageSize } : { offset: firstPageSize + (page - 2) * LANDING_MISSIONS_PAGE_SIZE, pageSize: LANDING_MISSIONS_PAGE_SIZE };
};

export const getTotalPages = (total: number, alertCard = false): number => {
  const firstPageSize = getFirstPageSize(alertCard);
  return total <= firstPageSize ? 1 : 1 + Math.ceil((total - firstPageSize) / LANDING_MISSIONS_PAGE_SIZE);
};

export const getPage = (searchParams: URLSearchParams): number => {
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  return Number.isNaN(page) ? 1 : Math.max(1, page);
};

export const getSelectedValues = (searchParams: URLSearchParams, key: LandingFilterKey): string[] => searchParams.getAll(key);

// Ordre par défaut des premiers résultats, pour que chaque dispositif apparaisse en première page (11 emplacements).
const DIVERSITY_ORDER = [
  "benevolat",
  "service_civique",
  "reserve_armees",
  "sapeurs_pompiers",
  "benevolat",
  "service_civique",
  "benevolat",
  "reserve_gendarmerie",
  "reserve_armees",
  "benevolat",
  "reserve_police_nationale",
];

// Emplacements de l'ordre par défaut, sans les dispositifs hors périmètre (périmètre vide : tous).
export const getDiversitySlots = (dispositifs?: string[] | null): MissionBrowseSlot[] =>
  DIVERSITY_ORDER.filter((dispositif) => !dispositifs?.length || dispositifs.includes(dispositif)).map((dispositif) => ({ filters: { dispositif: [dispositif] } }));

// Paramètres de `/missions/browse` pour une landing : seuls les filtres affichés sont lus dans l'URL,
// la liste est triée par date. Un filtre sur un critère du périmètre le restreint, sans jamais en sortir.
export const buildLandingBrowseFilters = (searchParams: URLSearchParams, config: LandingMissionsConfig): MissionBrowseFilters => {
  const page = getPage(searchParams);
  const filters: MissionBrowseFilters = {
    page,
    ...getPageWindow(page, config.alertCard),
    sort: "recent",
    exclude: config.exclude,
    includeRemote: config.includeRemote,
  };
  let hasSelection = false;
  for (const key of config.filters) {
    const scope = config.include?.[key];
    const values = getSelectedValues(searchParams, key).filter((value) => !scope || [scope].flat().includes(value));
    if (values.length) {
      filters[key] = values;
      hasSelection = true;
    }
  }
  // Point de la recherche par localisation : missions triées par distance, sur leur adresse la plus proche.
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (config.filters.includes("departmentCode") && searchParams.has("lat") && searchParams.has("lon") && !Number.isNaN(lat) && !Number.isNaN(lon)) {
    filters.lat = lat;
    filters.lon = lon;
  } else if (!hasSelection) {
    filters.slots = config.slots;
  }
  return { ...config.include, ...filters };
};

// Le dispositif, le domaine et le département donnés deviennent le périmètre (`include`) de la liste. Tous les filtres de
// /missions sont proposés, sauf la localisation avec un périmètre départemental et les critères limités à une seule valeur.
// Missions à distance et réserves (sans département) visibles, sauf périmètre départemental.
const ALL_LANDING_FILTERS: LandingFilterKey[] = ["departmentCode", "tranche_age", "type_mission", "activite", "domaine_engagement", "dispositif"];

// Périmètre du bloc CMS : listes de valeurs (vide ou absente : pas de restriction).
export type LandingScope = { dispositifs?: string[] | null; domainesEngagement?: string[] | null; departements?: string[] | null };

export const getLandingMissionsConfig = ({ dispositifs, domainesEngagement, departements }: LandingScope): LandingMissionsConfig => {
  const include: NonNullable<LandingMissionsConfig["include"]> = {
    ...(dispositifs?.length && { dispositif: dispositifs }),
    ...(domainesEngagement?.length && { domaine_engagement: domainesEngagement }),
    ...(departements?.length && { departmentCode: departements }),
  };
  // Les missions à distance restent visibles sauf si la liste est limitée à des départements.
  const isFilterShown = (key: LandingFilterKey) => (key === "departmentCode" ? !include.departmentCode : [include[key] ?? []].flat().length !== 1);
  return { include, includeRemote: !include.departmentCode, filters: ALL_LANDING_FILTERS.filter(isFilterShown), slots: getDiversitySlots(dispositifs) };
};

// Code département (format de la taxonomie : "01", "2A", "971"…) déduit d'un code postal français.
// La Corse se découpe par code postal : 200xx–201xx pour la Corse-du-Sud, 202xx–206xx pour la Haute-Corse.
export const getDepartmentCodeFromPostcode = (postcode: string): string | null => {
  if (!/^\d{5}$/.test(postcode)) return null;
  if (postcode.startsWith("20")) return Number(postcode) < 20200 ? "2A" : "2B";
  if (postcode.startsWith("97") || postcode.startsWith("98")) return postcode.slice(0, 3);
  return postcode.slice(0, 2);
};
