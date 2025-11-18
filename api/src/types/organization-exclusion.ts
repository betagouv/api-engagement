export interface OrganizationExclusionFindParams {
  excludedByAnnonceurId?: string;
  excludedForDiffuseurId?: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}

export interface OrganizationExclusionRecord {
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

export interface OrganizationExclusionCreateInput {
  excludedByAnnonceurId: string;
  excludedForDiffuseurId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}

export interface OrganizationExclusionCreateManyInput {
  excludedByAnnonceurId: string;
  excludedForDiffuseurId: string;
  organizationClientId?: string | null;
  organizationName?: string | null;
}
