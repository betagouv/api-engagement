export type MissionBrowseFacetCount = {
  key: string;
  count: number;
};

export type MissionBrowseTaxonomyKey = "domaine" | "secteur_activite" | "type_mission" | "tranche_age" | "competence_rome" | "dispositif";

export type MissionBrowseTaxonomyParams = Partial<Record<MissionBrowseTaxonomyKey, string | string[]>>;

export type MissionBrowseFilters = MissionBrowseTaxonomyParams & {
  page?: number;
  pageSize?: number;
  publisherId?: string | string[];
  departmentCode?: string | string[];
};

export type MissionBrowse = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
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
  remote: "no" | "possible" | "full" | null;
  openToMinors: boolean | null;
  reducedMobilityAccessible: boolean | null;
  places: number | null;
};
