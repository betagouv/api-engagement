export type PublisherRoleFilter = "annonceur" | "diffuseur" | "api" | "widget" | "campaign";

export interface PublisherDiffusionInput {
  diffuseurPublisherId?: string;
  publisherId?: string;
  diffuseurPublisherName?: string;
  publisherName?: string;
  moderator?: boolean;
  missionType?: string | null;
}

export interface PublisherDiffusionRecord {
  id: string;
  diffuseurPublisherId: string;
  annonceurPublisherId: string;
  moderator: boolean;
  missionType: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** @deprecated Use diffuseurPublisherId instead. */
  publisherId: string;
}

export interface PublisherRecord {
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
  missionType: string | null;
  isAnnonceur: boolean;
  hasApiRights: boolean;
  hasWidgetRights: boolean;
  hasCampaignRights: boolean;
  sendReport: boolean;
  sendReportTo: string[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishers: PublisherDiffusionRecord[];
}

export interface PublisherSearchParams {
  diffuseurOf?: string;
  moderator?: boolean;
  name?: string;
  ids?: string[];
  role?: PublisherRoleFilter;
  sendReport?: boolean;
  missionType?: string | null;
  includeDeleted?: boolean;
  accessiblePublisherIds?: string[];
}

export interface PublisherCreateInput {
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
  missionType?: string | null;
  isAnnonceur?: boolean;
  hasApiRights?: boolean;
  hasWidgetRights?: boolean;
  hasCampaignRights?: boolean;
  sendReport?: boolean;
  sendReportTo?: string[];
  publishers?: PublisherDiffusionInput[];
}

export type PublisherUpdatePatch = Partial<Omit<PublisherCreateInput, "publishers" | "name">> & {
  name?: string;
  publishers?: PublisherDiffusionInput[] | null;
  deletedAt?: Date | null;
  apikey?: string | null;
  logo?: string | null;
};
