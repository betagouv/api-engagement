import type { SendMissionEmailRequest, SendMissionEmailResponse } from "@engagement/dto";

import { client } from "~/services/client";

export async function sendMissionEmail(payload: SendMissionEmailRequest): Promise<SendMissionEmailResponse> {
  return client.post<SendMissionEmailResponse>("/api/email/mission", payload);
}
