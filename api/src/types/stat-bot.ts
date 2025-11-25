export interface StatBotRecord {
  id: string;
  origin: string | null;
  referer: string | null;
  userAgent: string | null;
  host: string | null;
  user: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatBotSearchParams {
  user?: string;
  offset?: number;
  limit?: number;
  includeTotal?: "all" | "filtered" | "none";
}

export interface StatBotCreateInput {
  user: string;
  origin?: string | null;
  referer?: string | null;
  userAgent?: string | null;
  host?: string | null;
}
