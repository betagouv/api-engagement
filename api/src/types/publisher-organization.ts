import { Prisma } from "../db/core";
import { OrganizationRecord } from "./organization";

export interface PublisherOrganizationFindParams {
  id?: string;
  ids?: string[];
  publisherId?: string;
  clientId?: string;
  clientIds?: string[];
  name?: string;
  rna?: string;
  siren?: string;
  siret?: string;
  url?: string;
  verifiedAt?: Date | null;
}

export interface PublisherOrganizationFindManyOptions {
  select?: Prisma.PublisherOrganizationSelect;
  take?: number;
  skip?: number;
}
export interface PublisherOrganizationRecord {
  id: string;
  publisherId: string;
  clientId: string | null;
  name: string | null;
  rna: string | null;
  siren: string | null;
  siret: string | null;
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
  verificationStatus: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type PublisherOrganizationWithRelations = PublisherOrganizationRecord & {
  organizationVerified: Partial<OrganizationRecord> | null;
};

export type PublisherOrganizationUpdateInput = Partial<Omit<PublisherOrganizationRecord, "id" | "createdAt" | "updatedAt">>;
