export type ImportRnaStatus = "SUCCESS" | "ALREADY_UPDATED" | "FAILED";

export interface ImportRnaRecord {
  id: string;
  year: number | null;
  month: number | null;
  resourceId: string | null;
  resourceCreatedAt: Date | null;
  resourceUrl: string | null;
  count: number;
  startedAt: Date;
  endedAt: Date;
  status: ImportRnaStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportRnaFindParams {
  resourceId?: string;
  status?: ImportRnaStatus | null;
  year?: number;
  month?: number;
}

export interface ImportRnaCreateInput {
  id?: string;
  year?: number | null;
  month?: number | null;
  resourceId?: string | null;
  resourceCreatedAt?: Date | null;
  resourceUrl?: string | null;
  count?: number;
  startedAt: Date;
  endedAt: Date;
  status?: ImportRnaStatus | null;
}

export type ImportRnaUpdatePatch = Partial<ImportRnaCreateInput>;
