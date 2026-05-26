import type { UserScoringCreateRequest, UserScoringCreateResponse, UserScoringUpdateRequest } from "@engagement/dto";
import { client } from "~/services/client";

export async function createUserScoring(payload: UserScoringCreateRequest): Promise<string> {
  const data = await client.post<UserScoringCreateResponse>("/api/user-scoring", payload);
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringUpdateRequest): Promise<void> {
  await client.put(`/api/user-scoring/${userScoringId}`, payload);
}
