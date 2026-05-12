import api from "~/services/api";

type ApiAnswer = { taxonomy: string; value: string } | { taxonomy: string; params: Record<string, unknown> };

type UserScoringPayload = {
  answers: ApiAnswer[];
};

type UserScoringCreateResponse = {
  id: string;
};

export async function createUserScoring(payload: UserScoringPayload, distinctId: string): Promise<string> {
  const data = await api.post<UserScoringCreateResponse>("/user-scoring", { ...payload, distinctId });
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringPayload, distinctId: string): Promise<void> {
  await api.put(`/user-scoring/${userScoringId}`, { ...payload, distinctId });
}
