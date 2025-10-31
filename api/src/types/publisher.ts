export type PublisherRoleFilter = "annonceur" | "diffuseur" | "api" | "widget" | "campaign";

export interface PublisherDiffuseurInput {
  publisherId: string;
  publisherName: string;
  moderator?: boolean;
  missionType?: string | null;
}

export interface PublisherDiffuseurRecord {
  id: string;
  publisherId: string;
  moderator: boolean;
  missionType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublisherRecord {
  id: string;
  _id: string;
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
  publishers: PublisherDiffuseurRecord[];
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
  publishers?: PublisherDiffuseurInput[];
}

export type PublisherUpdatePatch = Partial<Omit<PublisherCreateInput, "publishers" | "name">> & {
  name?: string;
  publishers?: PublisherDiffuseurInput[] | null;
  deletedAt?: Date | null;
  apikey?: string | null;
  logo?: string | null;
};
