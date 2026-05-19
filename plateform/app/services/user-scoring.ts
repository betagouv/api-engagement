import type { UserScoringCreateResponse } from "@engagement/dto";

import api from "~/services/api";

type ApiAnswer = { taxonomy: string; value: string } | { taxonomy: string; params: Record<string, unknown> };

type UserScoringCreatePayload = {
  answers: ApiAnswer[];
};

type UserScoringUpdatePayload = {
  answers?: ApiAnswer[];
  missionAlertEnabled?: boolean;
};

export async function createUserScoring(payload: UserScoringCreatePayload, distinctId: string): Promise<string> {
  const data = await api.post<UserScoringCreateResponse>("/user-scoring", { ...payload, distinctId });
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringUpdatePayload, distinctId: string): Promise<void> {
  await api.put(`/user-scoring/${userScoringId}`, { ...payload, distinctId });
}
