export const WARNING_STATUSES = ["TODO", "IN_PROGRESS", "RESOLVED"] as const;
export type WarningStatus = (typeof WARNING_STATUSES)[number];

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
  slackChannelId: string | null;
  slackMessageTs: string | null;
  assignees: WarningAssignee[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WarningCommentRecord {
  id: string;
  warningId: string;
  body: string;
  author: WarningAssignee | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarningOccurrenceRecord {
  id: string;
  warningId: string;
  source: string;
  title: string | null;
  description: string | null;
  createdAt: Date;
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
  /** Origine de la réception (`metabase`, `job`...) : enregistre une ligne d'historique avec le titre et la description. */
  source?: string;
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
  /** Origine de la réception (`metabase`, `job`...) : avec `occurrences` / `occurrencesIncrement`, enregistre une ligne d'historique. */
  source?: string;
  /** Message Slack de l'alerte (pour le mettre à jour quand le statut change). */
  slackMessage?: { channelId: string; ts: string };
}
