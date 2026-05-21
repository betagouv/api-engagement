import api from "~/services/api";
import { API_URL } from "~/services/config";

type SendMissionEmailPayload = {
  email: string;
  publisherId: string;
  userScoringId?: string;
  distinctId?: string;
  missionIds?: string[];
};

type SendMissionEmailResponse = {
  email_sent: boolean;
  email_skip_reason?: string;
};

export async function sendMissionEmail(payload: SendMissionEmailPayload): Promise<SendMissionEmailResponse> {
  return api.post<SendMissionEmailResponse>(`${API_URL}/email/mission`, payload);
}
