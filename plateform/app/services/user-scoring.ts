import type { UserScoringCreateRequest, UserScoringCreateResponse, UserScoringUpdateRequest } from "@engagement/dto";

import api from "~/services/api";

export async function createUserScoring(payload: UserScoringCreateRequest): Promise<string> {
  const data = await api.post<UserScoringCreateResponse>("/user-scoring", payload);
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringUpdateRequest): Promise<void> {
  await api.put(`/user-scoring/${userScoringId}`, payload);
}
