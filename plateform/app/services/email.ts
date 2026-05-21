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
  const res = await fetch("/api/email/mission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { ok: boolean; data?: SendMissionEmailResponse; code?: string };
  if (!res.ok || !json.ok) throw new Error(json.code ?? "fetch error on POST /api/email/mission");
  return json.data as SendMissionEmailResponse;
}
