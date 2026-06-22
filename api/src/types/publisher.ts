import { PublisherDiffusionRuleRecord } from "./publisher-diffusion-rule";

export type PublisherRoleFilter = "annonceur" | "diffuseur" | "api" | "widget" | "campaign";

export enum PublisherMissionType {
  VOLONTARIAT_SERVICE_CIVIQUE = "volontariat_service_civique",
  BENEVOLAT = "benevolat",
  VOLONTARIAT_SAPEURS_POMPIERS = "volontariat_sapeurs_pompiers",
  VOLONTARIAT_RESERVE_OPERATIONNELLE = "volontariat_reserve_operationnelle",
}

export interface PublisherDiffusionInput {
  publisherId: string;
}

/**
 * Une entrée de `publishers[]` : un annonceur diffusé par le publisher courant
 * (qui est le diffuseur). `publisherId`/`publisherName` désignent l'annonceur ;
 * `moderator`/`missionType` proviennent de ce publisher annonceur.
 */
export interface PublisherDiffusionRecord {
  id: string;
  publisherId: string;
  publisherName: string | null;
  moderator: boolean;
  missionType: PublisherMissionType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublisherDemarcheSimplifieeRecord {
  id: string;
  number: number;
  name: string | null;
  url: string | null;
  annotationKey: string | null;
}

export interface PublisherDemarcheSimplifieeInput {
  number: number;
  name?: string | null;
  url?: string | null;
  annotationKey?: string | null;
}

export interface PublisherRecord {
  _id: string; // Temporary field for backward compatibility in the app
  id: string;
  name: string;
  category: string | null;
  url: string | null;
  moderator: boolean;
  moderatorLink: string | null;
  email: string | null;
  documentation: string | null;
  logo: string | null;
  defaultMissionLogo: string | null;
  lead: string | null;
  feed: string | null;
  feedUsername: string | null;
  feedPassword: string | null;
  apikey: string | null;
  description: string;
  missionType: PublisherMissionType | null;
  isAnnonceur: boolean;
  selfHostedScript: boolean;
  hasApiRights: boolean;
  hasWidgetRights: boolean;
  hasCampaignRights: boolean;
  sendReport: boolean;
  sendReportTo: string[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishers: PublisherDiffusionRecord[];
  demarcheSimplifiees: PublisherDemarcheSimplifieeRecord[];
}

export type PublisherRecordWithRelations = PublisherRecord & {
  diffusionRules?: PublisherDiffusionRuleRecord[] | null;
};

export interface PublisherSearchParams {
  diffuseurOf?: string;
  moderator?: boolean;
  name?: string;
  ids?: string[];
  role?: PublisherRoleFilter;
  sendReport?: boolean;
  missionType?: PublisherMissionType | null;
  includeDeleted?: boolean;
  accessiblePublisherIds?: string[];
}

export interface PublisherCreateInput {
  id?: string;
  name: string;
  category?: string | null;
  url?: string | null;
  moderator?: boolean;
  moderatorLink?: string | null;
  email?: string | null;
  documentation?: string | null;
  logo?: string | null;
  defaultMissionLogo?: string | null;
  description?: string;
  lead?: string | null;
  feed?: string | null;
  feedUsername?: string | null;
  feedPassword?: string | null;
  apikey?: string | null;
  missionType?: PublisherMissionType | null;
  isAnnonceur?: boolean;
  selfHostedScript?: boolean;
  hasApiRights?: boolean;
  hasWidgetRights?: boolean;
  hasCampaignRights?: boolean;
  sendReport?: boolean;
  sendReportTo?: string[];
  publishers?: PublisherDiffusionInput[];
  demarcheSimplifiees?: PublisherDemarcheSimplifieeInput[];
}

export type PublisherUpdatePatch = Partial<Omit<PublisherCreateInput, "publishers" | "name">> & {
  name?: string;
  publishers?: PublisherDiffusionInput[] | null;
  deletedAt?: Date | null;
  apikey?: string | null;
  logo?: string | null;
};
