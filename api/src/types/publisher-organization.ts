import { Prisma } from "@/db/core";
import { OrganizationRecord } from "@/types/organization";

/**
 * Colonnes de type tableau (`TEXT[]`) de `publisher_organization` sur lesquelles un matching
 * insensible à la casse est requis (impossible via Prisma → résolution en SQL brut).
 * Source de vérité unique : ajouter une colonne ici suffit, le typage guide le reste.
 * Sert aussi d'allowlist anti-injection (aucune colonne hors de cette liste n'est interpolée).
 */
export const ORG_ARRAY_COLUMNS = ["parent_organizations", "actions"] as const;
export type OrgArrayColumn = (typeof ORG_ARRAY_COLUMNS)[number];

/**
 * Résout les ids d'organisations dont un élément de la colonne `column` correspond à `value`,
 * insensiblement à la casse. Injecté dans les builders de règles (widget + diffusion) pour
 * garder les utils agnostiques de la DB (l'implémentation vit dans le service publisher-organization).
 */
export type OrganizationArrayIdsResolver = (column: OrgArrayColumn, value: string) => Promise<string[]>;

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
  clientId: string;
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
  organizationVerified?: Partial<OrganizationRecord> | null;
};

export type PublisherOrganizationUpdateInput = Partial<Omit<PublisherOrganizationRecord, "id" | "createdAt" | "updatedAt">>;
