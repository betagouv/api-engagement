export type CampaignType = "AD_BANNER" | "MAILING" | "TILE_BUTTON" | "OTHER";

export interface CampaignRecord {
  id: string;
  name: string;
  type: CampaignType;
  url: string;
  urlSource: string | null;
  fromPublisherId: string;
  fromPublisherName: string;
  toPublisherId: string;
  toPublisherName: string;
  deletedAt: Date | null;
  reassignedAt: Date | null;
  reassignedByUsername: string | null;
  reassignedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  trackers: { key: string; value: string }[];
}

export interface CampaignSearchParams {
  fromPublisherId?: string;
  toPublisherId?: string;
  search?: string;
  active?: boolean;
  offset?: number;
  limit?: number;
  all?: boolean;
  includeTotal?: "all" | "filtered" | "none";
}

export interface CampaignSearchResult {
  results: CampaignRecord[];
  total: number;
}

export interface CampaignCreateInput {
  id?: string;
  name: string;
  type: CampaignType;
  url: string;
  urlSource?: string | null;
  fromPublisherId: string;
  toPublisherId: string;
  trackers?: CampaignTrackerInput[];
  active?: boolean;
}

export interface CampaignTrackerInput {
  key: string;
  value: string;
}

export interface CampaignUpdatePatch {
  name?: string;
  type?: CampaignType;
  url?: string;
  urlSource?: string | null;
  fromPublisherId?: string;
  toPublisherId?: string;
  trackers?: CampaignTrackerInput[];
  active?: boolean;
}
