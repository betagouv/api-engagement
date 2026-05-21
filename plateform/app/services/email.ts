import { client } from "~/services/client";

export type SendMissionEmailPayload = {
  email: string;
  publisherId: string;
  userScoringId?: string;
  distinctId?: string;
  missionIds?: string[];
};

export type SendMissionEmailResponse = {
  email_sent: boolean;
  email_skip_reason?: string;
};

export async function sendMissionEmail(payload: SendMissionEmailPayload): Promise<SendMissionEmailResponse> {
  return client.post<SendMissionEmailResponse>("/api/email/mission", payload);
}
