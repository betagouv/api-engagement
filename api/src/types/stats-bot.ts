export interface StatsBotRecord {
  id: string;
  origin: string | null;
  referer: string | null;
  userAgent: string | null;
  host: string | null;
  user: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatsBotSearchParams {
  user?: string;
  offset?: number;
  limit?: number;
  includeTotal?: "all" | "filtered" | "none";
}

export interface StatsBotCreateInput {
  user: string;
  origin?: string | null;
  referer?: string | null;
  userAgent?: string | null;
  host?: string | null;
}
