export interface PublisherOrganizationFindParams {
  publisherId: string;
  organizationClientId?: string;
  organizationClientIds?: string[];
  name?: string;
  rna?: string;
  siren?: string;
  siret?: string;
  url?: string;
}

export interface PublisherOrganizationRecord {
  id: string;
  publisherId: string;
  organizationClientId: string;
  name: string | null;
  rna: string | null;
  rnaVerified: string | null;
  siren: string | null;
  sirenVerified: string | null;
  siret: string | null;
  siretVerified: string | null;
  url: string | null;
  logo: string | null;
  description: string | null;
  legalStatus: string | null;
  type: string | null;
  actions: string[];
  fullAddress: string | null;
  postalCode: string | null;
  city: string | null;
  beneficiaries: string[];
  parentOrganizations: string[];

  verifiedAt: Date | null;
  organizationIdVerified: string | null;

  createdAt: Date;
  updatedAt: Date;
}
