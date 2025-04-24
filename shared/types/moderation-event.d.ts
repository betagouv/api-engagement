/**
 * Interface représentant un événement de modération
 */
export interface ModerationEvent {
  _id?: string;
  missionId: string;
  moderatorId: string;
  userId?: string | null;
  userName?: string | null;
  initialStatus?: "ACCEPTED" | "REFUSED" | "PENDING" | "ONGOING" | null;
  newStatus?: "ACCEPTED" | "REFUSED" | "PENDING" | "ONGOING" | null;
  initialTitle?: string | null;
  newTitle?: string | null;
  initialComment?: string | null;
  newComment?: string | null;
  initialNote?: string | null;
  newNote?: string | null;
  initialSiren?: string | null;
  newSiren?: string | null;
  initialRNA?: string | null;
  newRNA?: string | null;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
