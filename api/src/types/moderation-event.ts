export type ModerationEventStatus = "ACCEPTED" | "REFUSED" | "PENDING" | "ONGOING";

export interface ModerationEventRecord {
  id: string;
  missionId: string;
  moderatorId: string;
  userId: string | null;
  userName: string | null;
  initialStatus: ModerationEventStatus | null;
  newStatus: ModerationEventStatus | null;
  initialComment: string | null;
  newComment: string | null;
  initialNote: string | null;
  newNote: string | null;
  initialTitle: string | null;
  newTitle: string | null;
  initialSiren: string | null;
  newSiren: string | null;
  initialRNA: string | null;
  newRNA: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SortOrder = "asc" | "desc";

export interface ModerationEventParams {
  missionId?: string;
  moderatorId?: string;
  skip?: number;
  take?: number;
}

export type ModerationEventCreateInput = {
  id?: string;
  missionId: string;
  moderatorId: string;
  userId?: string | null;
  userName?: string | null;
  initialStatus?: ModerationEventStatus | null;
  newStatus?: ModerationEventStatus | null;
  initialComment?: string | null;
  newComment?: string | null;
  initialNote?: string | null;
  newNote?: string | null;
  initialTitle?: string | null;
  newTitle?: string | null;
  initialSiren?: string | null;
  newSiren?: string | null;
  initialRNA?: string | null;
  newRNA?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};
