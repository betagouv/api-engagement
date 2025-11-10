export type ImportStatus = "SUCCESS" | "FAILED";

export interface ImportRecord {
  _id: string; // Temporary field for backward compatibility in the app
  id: string;
  name: string;
  publisherId: string;
  missionCount: number;
  refusedCount: number;
  createdCount: number;
  deletedCount: number;
  updatedCount: number;
  startedAt: Date | null;
  endedAt: Date | null;
  status: ImportStatus;
  error: string | null;
  failed: unknown;
}

export interface ImportSearchParams {
  publisherId?: string;
  publisherIds?: string[];
  skip?: number;
  size?: number;
  status?: ImportStatus;
  startedAtGte?: Date;
  startedAtLt?: Date;
  endedAtGt?: Date;
  endedAtGte?: Date;
}

export interface ImportCreateInput {
  name: string;
  publisherId: string;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  status?: ImportStatus;
  missionCount?: number;
  refusedCount?: number;
  createdCount?: number;
  deletedCount?: number;
  updatedCount?: number;
  error?: string | null;
  failed?: unknown;
}

export type ImportUpdatePatch = Partial<Omit<ImportCreateInput, "publisherId" | "name">> & {
  name?: string;
};


