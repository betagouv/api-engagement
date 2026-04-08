export type TaxonomyForPrompt = Array<{
  key: string;
  label: string;
  type: string;
  values: Array<{ key: string; label: string }>;
}>;

export type MissionForPrompt = {
  title: string;
  description: string | null;
  tasks: string[];
  audience: string[];
  softSkills: string[];
  requirements: string[];
  tags: string[];
  type: string | null;
  remote: string | null;
  openToMinors: boolean | null;
  reducedMobilityAccessible: boolean | null;
  duration: number | null;
  startAt: Date | null;
  endAt: Date | null;
  schedule: string | null;
  domainName: string | null;
  activities: string[];
  organizationName: string | null;
  organizationType: string | null;
  organizationDescription: string | null;
  organizationActions: string[];
  organizationBeneficiaries: string[];
  organizationParentOrganizations: string[];
  organizationObject: string | null;
  organizationSocialObject1: string | null;
  organizationSocialObject2: string | null;
};
