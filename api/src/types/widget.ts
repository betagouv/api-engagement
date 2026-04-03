import { PublisherDiffusionExclusionRecord } from "./publisher-diffusion-exclusion";

export type WidgetStyle = "carousel" | "page";
export type WidgetType = "benevolat" | "volontariat_service_civique" | "volontariat_sapeurs_pompiers" | "volontariat_reserve_operationnelle";
export type WidgetRuleCombinator = "and" | "or";

export type WidgetLocation = {
  lat: number;
  lon: number;
  label?: string | null;
} | null;

export interface WidgetRuleRecord {
  id: string;
  field: string;
  fieldType: string | null;
  operator: string;
  value: string;
  combinator: WidgetRuleCombinator;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetRecord {
  id: string;
  name: string;
  color: string;
  style: WidgetStyle;
  type: WidgetType;
  location: WidgetLocation;
  distance: string;
  rules: WidgetRuleRecord[];
  publishers: string[];
  url: string | null;
  jvaModeration: boolean;
  fromPublisherId: string;
  fromPublisherName: string | null;
  fromPublisherDiffusionExclusions?: PublisherDiffusionExclusionRecord[];
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetSearchParams {
  fromPublisherId?: string;
  fromPublisherIds?: string[];
  search?: string;
  active?: boolean;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
}

export type WidgetRuleInput = {
  combinator: WidgetRuleCombinator;
  field: string;
  fieldType?: string | null;
  operator: string;
  value: string;
};

export type WidgetCreateInput = {
  id?: string;
  name: string;
  color?: string;
  style?: WidgetStyle;
  type?: WidgetType;
  location?: WidgetLocation;
  distance?: string;
  rules?: WidgetRuleInput[];
  publishers?: string[];
  url?: string | null;
  jvaModeration?: boolean;
  fromPublisherId: string;
  fromPublisherName?: string | null;
  active?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type WidgetUpdatePatch = Partial<Omit<WidgetCreateInput, "fromPublisherId" | "fromPublisherName" | "name">> & {
  name?: string;
  publishers?: string[] | null;
  rules?: WidgetRuleInput[] | null;
  location?: WidgetLocation;
  deletedAt?: Date | null;
};
