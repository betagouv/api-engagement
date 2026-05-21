import type { UserScoringCreateRequest, UserScoringCreateResponse, UserScoringUpdateRequest } from "@engagement/dto";

import api from "~/services/api";
import { API_URL } from "~/services/config";

export async function createUserScoring(payload: UserScoringCreateRequest): Promise<string> {
  const data = await api.post<UserScoringCreateResponse>(`${API_URL}/user-scoring`, payload);
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringUpdateRequest): Promise<void> {
  await api.put(`${API_URL}/user-scoring/${userScoringId}`, payload);
}
