export type WarningStatus = "TODO" | "IN_PROGRESS" | "RESOLVED";

export interface WarningAssignee {
  id: string;
  firstname: string;
  lastname: string | null;
  photo: string | null;
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
  notifiedAt: Date | null;
  assignees: WarningAssignee[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WarningFindParams {
  fixed?: boolean;
  publisherId?: string;
  type?: string;
  status?: WarningStatus;
  createdAtGte?: Date;
  createdAtLt?: Date;
  limit?: number;
  skip?: number;
}

export interface WarningCreateInput {
  type: string;
  title?: string | null;
  description?: string | null;
  publisherId: string;
  seen?: boolean;
  /** @deprecated Utiliser `status`. */
  fixed?: boolean;
  fixedAt?: Date | null;
  occurrences?: number;
  status?: WarningStatus;
  procedureUrl?: string | null;
  assigneeIds?: string[];
}

export interface WarningUpdatePatch {
  type?: string;
  title?: string | null;
  description?: string | null;
  publisherId?: string;
  seen?: boolean;
  /** @deprecated Utiliser `status`. */
  fixed?: boolean;
  fixedAt?: Date | null;
  occurrences?: number;
  /** Incrémente atomiquement `occurrences` (prioritaire sur `occurrences`). */
  occurrencesIncrement?: number;
  status?: WarningStatus;
  procedureUrl?: string | null;
  /** Ajoute des assignés (sans doublon). */
  assigneeIds?: string[];
}
