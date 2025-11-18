import { OrganizationExclusion } from "../db/core";

export interface OrganizationExclusionRecord extends OrganizationExclusion {}

export interface OrganizationExclusionCreateInput {
  excludedByPublisherId: string;
  excludedForPublisherId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}

export interface OrganizationExclusionCreateManyInput {
  excludedByPublisherId: string;
  excludedForPublisherId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}

