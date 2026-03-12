export interface PublisherDiffusionExclusionFindParams {
  excludedByAnnonceurId?: string;
  excludedForDiffuseurId?: string;
  publisherOrganizationId?: string | null;
  organizationClientId?: string | null;
  organizationName?: string | null;
}

export interface PublisherDiffusionExclusionRecord {
  id: string;
  excludedByAnnonceurId: string;
  excludedByAnnonceurName?: string | null;
  excludedForDiffuseurId: string;
  excludedForDiffuseurName?: string | null;
  organizationClientId?: string | null;
  organizationName?: string | null;
  publisherOrganizationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublisherDiffusionExclusionCreateInput {
  excludedByAnnonceurId: string;
  excludedForDiffuseurId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
  publisherOrganizationId?: string | null;
}

export interface PublisherDiffusionExclusionCreateManyInput {
  excludedByAnnonceurId: string;
  excludedForDiffuseurId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
  publisherOrganizationId?: string | null;
}
