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
  createdAt: Date;
  updatedAt: Date;
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
}
