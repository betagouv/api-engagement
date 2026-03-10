import { ModerationEventStatus } from "@/types/moderation-event";

export interface ModerationUpdate {
  status: ModerationEventStatus | null;
  comment: string | null;
  note: string | null;
  date: Date | null;
}
