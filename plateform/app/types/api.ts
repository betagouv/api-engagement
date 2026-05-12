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
