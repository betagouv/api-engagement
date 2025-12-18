export type StatEventSource = "api" | "widget" | "campaign" | "seo" | "jstag" | "publisher";
export type StatEventType = "print" | "apply" | "click" | "account";
export type StatEventStatus = "PENDING" | "VALIDATED" | "CANCEL" | "CANCELED" | "REFUSED" | "CARRIED_OUT" | undefined;
export type StatEventExportStatus = "SUCCESS" | "FAILURE";

export interface StatEventRecord {
  _id: string;
  clickUser?: string;
  clickId?: string;
  requestId?: string;
  origin: string;
  referer: string;
  userAgent: string;
  host: string;
  user?: string;
  isBot: boolean;
  isHuman: boolean;
  createdAt: Date;
  fromPublisherId: string;
  fromPublisherName?: string;
  toPublisherId: string;
  toPublisherName?: string;
  missionId?: string;
  missionClientId?: string;
  missionDomain?: string;
  missionTitle?: string;
  missionPostalCode?: string;
  missionDepartmentName?: string;
  missionOrganizationId?: string;
  missionOrganizationName?: string;
  missionOrganizationClientId?: string;
  source: StatEventSource;
  sourceId: string;
  sourceName: string;
  customAttributes?: Record<string, unknown>;
  tag?: string;
  tags?: string[];
  type: StatEventType;
  status: StatEventStatus;
  exportToAnalytics?: StatEventExportStatus;
}

export interface WarningBotAggregationBucket {
  key: string;
  doc_count: number;
}

export interface WarningBotAggregations {
  type: WarningBotAggregationBucket[];
  publisherTo: WarningBotAggregationBucket[];
  publisherFrom: WarningBotAggregationBucket[];
}

export interface CountByTypeParams {
  publisherId: string;
  from: Date;
  types?: StatEventType[];
}

export interface CountEventsParams {
  type?: StatEventType;
  user?: string;
  clickUser?: string;
  from?: Date;
}

export interface HasRecentStatEventWithClickIdParams {
  type: StatEventType;
  clickId: string;
  since: Date;
}

export interface CountClicksByPublisherForOrganizationSinceParams {
  publisherIds: string[];
  organizationClientId: string;
  from: Date;
}

export interface SearchStatEventsParams {
  fromPublisherId?: string;
  toPublisherId?: string;
  type?: StatEventType;
  sourceId?: string;
  size?: number;
  skip?: number;
}

export type ViewStatsDateFilter = {
  operator: "gt" | "lt";
  date: Date;
};

export interface ViewStatsFilters {
  fromPublisherName?: string;
  toPublisherName?: string;
  fromPublisherId?: string;
  toPublisherId?: string;
  missionDomain?: string;
  missionDepartmentName?: string;
  missionOrganizationId?: string;
  type?: string;
  source?: string;
  createdAt?: ViewStatsDateFilter[];
}

export type ViewStatsFacetField =
  | "type"
  | "source"
  | "missionDomain"
  | "missionDepartmentName"
  | "missionOrganizationId"
  | "fromPublisherId"
  | "toPublisherId"
  | "tag";

export interface SearchViewStatsParams {
  publisherId: string;
  size?: number;
  filters?: ViewStatsFilters;
  facets?: ViewStatsFacetField[];
}

export type ViewStatsFacet = { key: string; doc_count: number };

export interface SearchViewStatsResult {
  total: number;
  facets: Record<string, ViewStatsFacet[]>;
}

export interface StatEventMissionStatsSummary {
  key: string;
  name?: string;
  doc_count: number;
}

export interface AggregateMissionStatsParams {
  from: Date;
  to: Date;
  toPublisherName?: string;
  excludeToPublisherName?: string;
  excludeUsers?: string[];
}

export interface MissionStatsAggregationBucket {
  eventCount: number;
  missionCount: number;
}

export type MissionStatsAggregations = Record<StatEventType, MissionStatsAggregationBucket>;

export interface FindWarningBotCandidatesParams {
  from: Date;
  minClicks: number;
}

export interface WarningBotCandidate {
  user: string;
  clickCount: number;
  publishers: WarningBotAggregationBucket[];
  userAgents: WarningBotAggregationBucket[];
}

export interface ScrollStatEventsFilters {
  exportToPgStatusMissing?: boolean;
  hasBotOrHumanFlag?: boolean;
}

export interface ScrollStatEventsParams {
  type: StatEventType;
  batchSize?: number;
  cursor?: string | null;
  filters?: ScrollStatEventsFilters;
  sourceFields?: string[];
}

export interface ScrollStatEventsResult {
  events: StatEventRecord[];
  cursor: string | null;
  total: number;
}
