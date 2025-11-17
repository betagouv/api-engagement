export type ImportStatus = "SUCCESS" | "FAILED";

export interface ImportRecord {
  id: string;
  name: string;
  publisherId: string;
  publisherName: string;
  publisherLogo: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  status: ImportStatus;
}

export interface ImportFindParams {
  publisherId?: string;
  publisherIds?: string[];
  skip?: number;
  size?: number;
  status?: ImportStatus;
  startedAtGte?: Date;
  startedAtLt?: Date;
  finishedAtGt?: Date;
  finishedAtGte?: Date;
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
