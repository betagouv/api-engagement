import { userScoringService } from "@/services/user-scoring";

/** Échoue tôt avec un message explicite plutôt que de produire silencieusement un classement vide. */
export const assertUserScoringExists = async (userScoringId: string): Promise<void> => {
  if (!(await userScoringService.exists(userScoringId))) {
    throw new Error(`[matchingEngineService] user_scoring '${userScoringId}' not found.`);
  }
};
