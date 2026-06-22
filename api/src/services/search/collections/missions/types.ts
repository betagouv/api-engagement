import type { IndexedTaxonomyKey } from "./fields";

export type MissionIndexDocument = Partial<Record<IndexedTaxonomyKey, string[]>> & {
  id: string;
  publisherId: string;
  publisherOrganizationId?: string;
  publisherOrganizationClientId?: string;
  publisherOrganizationParentOrganizations?: string[];
  departmentCodes: string[];
};
