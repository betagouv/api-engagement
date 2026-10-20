export type WarningStatus = "TODO" | "IN_PROGRESS" | "RESOLVED";

export interface WarningAssignee {
  id: string;
  firstname: string;
  lastname: string | null;
}

export interface WarningRecord {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  publisherId: string;
  publisherName: string | null;
  publisherLogo: string | null;
  seen: boolean;
  fixed: boolean;
  fixedAt: Date | null;
  occurrences: number;
  status: WarningStatus;
  procedureUrl: string | null;
  assignees: WarningAssignee[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WarningFindParams {
  fixed?: boolean;
  publisherId?: string;
  type?: string;
  createdAtGte?: Date;
  createdAtLt?: Date;
  limit?: number;
}

export interface WarningCreateInput {
  type: string;
  title?: string | null;
  description?: string | null;
  publisherId: string;
  seen?: boolean;
  fixed?: boolean;
  fixedAt?: Date | null;
  occurrences?: number;
  procedureUrl?: string | null;
  assigneeIds?: string[];
}

export interface WarningUpdatePatch {
  type?: string;
  title?: string | null;
  description?: string | null;
  publisherId?: string;
  seen?: boolean;
  fixed?: boolean;
  fixedAt?: Date | null;
  occurrences?: number;
  status?: WarningStatus;
}
