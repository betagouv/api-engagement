export type BrevoHttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type BrevoRequestBody = Record<string, any>;

export type BrevoApiResponse<T = any> = {
  ok: boolean;
  data: T;
};

export type EmailOptions = {
  params: Record<string, any>;
  emailTo: string[];
  subject?: string;
  emailBcc?: string[];
  attachment?: any;
  tags?: string[];
};

export type EmailRecipient = {
  email: string;
};

export type EmailBody = {
  subject?: string;
  templateId?: number;
  params?: Record<string, any>;
  to: EmailRecipient[];
  bcc?: EmailRecipient[];
  attachment?: any;
  tags?: string[];
};

export type CreateOrUpdateContactParams = {
  email: string;
  userScoringId?: string;
  distinctId: string;
  missionAlertEnabled: boolean;
  listId: number;
};

export type ContactAttributes = {
  DISTINCT_ID: string;
  MISSION_ALERT_ENABLED: boolean;
  USER_SCORING_ID?: string;
};

export type ContactBody = {
  email: string;
  updateEnabled: true;
  listIds: number[];
  attributes: ContactAttributes;
};
