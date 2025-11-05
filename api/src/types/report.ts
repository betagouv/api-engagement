type Json = any;

export type ReportDataTemplate = "BOTH" | "RECEIVED" | "SENT";

export interface ReportRecord {
  id: string;
  name: string;
  month: number;
  year: number;
  url: string;
  objectName: string | null;
  publisherId: string;
  publisherName: string;
  dataTemplate: ReportDataTemplate | null;
  sentAt: Date | null;
  sentTo: string[];
  status: string;
  data: Json;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface ReportFindParams {
  publisherId?: string;
  month?: number;
  year?: number;
}

export interface ReportSearchFilters extends ReportFindParams {
  status?: string;
}

export type ReportSortField = "createdAt" | "publisherName" | "sentAt";

export interface ReportSearchParams extends ReportSearchFilters {
  sortBy: ReportSortField;
  from: number;
  size: number;
}

export interface ReportAggregations {
  publishers: Array<{ _id: string; count: number; name: string }>;
  status: Array<{ _id: string; count: number }>;
}

export interface ReportSearchResult {
  data: ReportRecord[];
  total: number;
  aggs: ReportAggregations;
}

export type ReportCreateInput = {
  name: string;
  month: number;
  year: number;
  url: string;
  objectName: string | null;
  publisherId: string;
  publisherName: string;
  dataTemplate: ReportDataTemplate | null;
  sentAt: Date | null;
  sentTo: string[];
  status: string;
  data: Json;
};

export type ReportUpdatePatch = Partial<ReportCreateInput> & {
  deletedAt?: Date | null;
};
