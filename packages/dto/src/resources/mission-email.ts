export type MissionEmailSkipReason = "NO_MATCHING_RESULT" | "MISSION_NOT_FOUND";

export type SendMissionEmailRequest = {
  email: string;
  publisherId: string;
  distinctId?: string;
  userScoringId?: string;
  missionIds?: string[];
};

export type SendMissionEmailResponse = {
  user_scoring_id?: string;
  email_sent: boolean;
  email_skip_reason?: MissionEmailSkipReason;
};
