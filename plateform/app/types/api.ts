export type FacetCount = { key: string; count: number };

export type BrowseMission = {
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
  publisherName: string | null;
  publisherLogo: string | null;
  applicationUrl: string | null;
  schedule: string | null;
};

export type BrowseResponse = {
  data: BrowseMission[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, FacetCount[]>;
};

export type BrowseFilters = {
  page?: number;
  pageSize?: number;
  publisherId?: string[];
  departmentCode?: string[];
  domaine?: string[];
  secteur_activite?: string[];
  type_mission?: string[];
  tranche_age?: string[];
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
