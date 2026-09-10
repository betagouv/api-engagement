import type { UserScoringCreateRequest, UserScoringCreateResponse, UserScoringUpdateRequest } from "@engagement/dto";
import { client } from "~/services/client";
import { useQuizStore } from "~/stores/quiz";
import { buildPayload } from "~/utils/quiz";

export async function createUserScoring(payload: UserScoringCreateRequest): Promise<string> {
  const data = await client.post<UserScoringCreateResponse>("/api/user-scoring", payload);
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringUpdateRequest): Promise<void> {
  await client.put(`/api/user-scoring/${userScoringId}`, payload);
}

// Changer ses critères depuis les résultats crée un nouveau scoring plutôt que de modifier l'existant :
// le PUT n'est accepté que depuis le navigateur qui a créé le scoring (contrôle du distinctId, 403 sinon)
// et il remplacerait les réponses d'un scoring potentiellement partagé (lien reçu par email).
// Renvoie l'id du nouveau scoring, ou null quand il ne reste aucune réponse exploitable.
export async function createQuizScoring(): Promise<string | null> {
  const { answers, distinctId, setUserScoringId } = useQuizStore.getState();
  const payload = buildPayload(answers);
  if (payload.answers.length === 0) return null;
  const userScoringId = await createUserScoring({ ...payload, distinctId });
  setUserScoringId(userScoringId);
  return userScoringId;
}
