export interface PublisherDiffusionExclusionFindParams {
  excludedByAnnonceurId?: string;
  excludedForDiffuseurId?: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}

export interface PublisherDiffusionExclusionRecord {
  id: string;
  excludedByAnnonceurId: string;
  excludedByAnnonceurName: string;
  excludedForDiffuseurId: string;
  excludedForDiffuseurName: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublisherDiffusionExclusionCreateInput {
  excludedByAnnonceurId: string;
  excludedForDiffuseurId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}

export interface PublisherDiffusionExclusionCreateManyInput {
  excludedByAnnonceurId: string;
  excludedForDiffuseurId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}
