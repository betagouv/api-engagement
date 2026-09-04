import type { UserScoringCreateRequest, UserScoringCreateResponse, UserScoringUpdateRequest } from "@engagement/dto";
import { client } from "~/services/client";
import { invalidateInitialMatches } from "~/services/matching";
import { useQuizStore } from "~/stores/quiz";
import { buildPayload } from "~/utils/quiz";

export async function createUserScoring(payload: UserScoringCreateRequest): Promise<string> {
  const data = await client.post<UserScoringCreateResponse>("/api/user-scoring", payload);
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringUpdateRequest): Promise<void> {
  await client.put(`/api/user-scoring/${userScoringId}`, payload);
}

// PUT du scoring avec les réponses courantes du store, puis invalidation du cache des résultats.
// Comme dans le layout du quiz : pas de PUT quand il n'y a plus aucune réponse exploitable.
export async function saveQuizScoring(userScoringId: string): Promise<void> {
  const { answers, distinctId } = useQuizStore.getState();
  const payload = buildPayload(answers);
  if (payload.answers.length === 0) return;
  await updateUserScoring(userScoringId, { ...payload, distinctId });
  invalidateInitialMatches(userScoringId);
}
