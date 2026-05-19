export type UserScoringAnswer = { taxonomy: string; value: string; params?: never } | { taxonomy: string; params: Record<string, unknown>; value?: never };

export type UserScoringCreateRequest = {
  answers: UserScoringAnswer[];
  distinctId?: string;
  missionAlertEnabled?: boolean;
};

export type UserScoringUpdateRequest = {
  answers?: UserScoringAnswer[];
  distinctId: string;
  missionAlertEnabled?: boolean;
};

export type UserScoringCreateResponse = {
  id: string;
};

export type UserScoringUpdateResponse = {
  user_scoring_id: string;
  created_count: number;
  mission_alert_enabled: boolean;
};
