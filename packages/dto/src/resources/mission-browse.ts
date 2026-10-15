export type MissionBrowseFacetCount = {
  key: string;
  count: number;
  label?: string;
};

export type MissionBrowseTaxonomyKey = "domaine_engagement" | "activite" | "type_mission" | "tranche_age" | "competence_rome" | "dispositif";

export type MissionBrowseTaxonomyParams = Partial<Record<MissionBrowseTaxonomyKey, string | string[]>>;

// Emplacement réservé en tête de liste : une mission qui coche tous les critères `filters` (ET entre les clés,
// OU entre les valeurs d'une clé) et, si `anyOf` est renseigné, au moins un de ses critères (OU entre les clés).
export type MissionBrowseSlot = {
  filters: Partial<Record<MissionBrowseTaxonomyKey, string[]>>;
  anyOf?: Partial<Record<MissionBrowseTaxonomyKey, string[]>>;
};

export type MissionBrowseFilters = MissionBrowseTaxonomyParams & {
  page?: number;
  pageSize?: number;
  publisherId?: string | string[];
  departmentCode?: string | string[];
  // Valeurs de taxonomie à masquer complètement (résultats et compteurs des filtres).
  exclude?: MissionBrowseTaxonomyParams;
  // Avec un département choisi, garde aussi les missions à distance ou sans lieu précis (remote `full` / `local`).
  includeRemote?: boolean;
  // `recent` : missions les plus récentes d'abord.
  sort?: "recent";
  // Emplacements des premiers résultats, appliqués uniquement quand aucun filtre n'est coché.
  slots?: MissionBrowseSlot[];
};

export type MissionBrowse = {
  id: string;
  title: string;
  description: string | null;
  remote: "no" | "possible" | "full" | "local" | null;
  city: string | null;
  country: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  domain: string | null;
  domainOriginal: string | null;
  domainLogo: string | null;
  photo: string | null;
  organizationName: string | null;
  organizationLogo: string | null;
  publisherId: string | null;
  publisherName: string | null;
  publisherLogo: string | null;
  applicationUrl: string | null;
  schedule: string | null;
  places: number | null;
  tags: string[];
  addresses: Array<{
    city: string | null;
    country: string | null;
    location: { lat: number; lon: number } | null;
  }>;
  compensation: MissionDetailCompensation | null;
};

export type MissionBrowseResponse = {
  data: MissionBrowse[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, MissionBrowseFacetCount[]>;
};

export type MissionDetailLocation = {
  city: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
};

export type MissionDetailCompensation = {
  amount: number | null;
  amountMax: number | null;
  unit: string | null;
  type: string | null;
};

export type MissionDetailResponse = {
  id: string;
  title: string;
  domain: string | null;
  domainLogo: string | null;
  type: string | null;
  publisherId: string | null;
  publisherName: string | null;
  publisherLogo: string | null;
  organizationName: string | null;
  organizationLogo: string | null;
  location: MissionDetailLocation | null;
  startAt: string | null;
  endAt: string | null;
  duration: number | null;
  schedule: string | null;
  compensation: MissionDetailCompensation | null;
  descriptionHtml: string | null;
  description: string | null;
  applicationUrl: string;
  photo: string | null;
  remote: "no" | "possible" | "full" | "local" | null;
  openToMinors: boolean | null;
  reducedMobilityAccessible: boolean | null;
  places: number | null;
};
