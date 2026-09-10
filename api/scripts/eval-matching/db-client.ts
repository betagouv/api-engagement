import { prisma } from "@/db/postgres";
import { missionBrowseService } from "@/services/mission-browse";
import { missionMatchService } from "@/services/mission-match";
import type { MatchingEngineVersion } from "@/services/matching-engine/types";
import { userScoringService } from "@/services/user-scoring";

import type { MatchResponse, MissionWithDetail, UserScoringAnswer } from "./types";

export const createUserScoring = async (answers: UserScoringAnswer[], distinctId: string): Promise<string> => {
  const response = await userScoringService.create({ answers, distinctId, missionAlertEnabled: false });
  return response.id;
};

export const getMatch = async (params: { userScoringId: string; publisherId: string; engineVersion?: MatchingEngineVersion }): Promise<MatchResponse> => {
  const match = await missionMatchService.getMatchedMissions({
    userScoringId: params.userScoringId,
    publisherId: params.publisherId,
    version: params.engineVersion,
    limit: 5,
    offset: 0,
  });

  if (params.engineVersion && match.engineVersion !== params.engineVersion) {
    throw new Error(`Version moteur inattendue: demande=${params.engineVersion}, reponse=${match.engineVersion ?? "absente"}. API cible pas a jour.`);
  }

  return match as MatchResponse;
};

export const getMissionDetails = async (match: MatchResponse, publisherId: string): Promise<MissionWithDetail[]> => {
  return Promise.all(
    match.items.map(async (item) => {
      const detail = await missionBrowseService.findById(item.mission.id, publisherId, item.mission.location.addressId ?? undefined);
      return { ...item, detail, descriptionMissing: !detail?.description };
    })
  );
};

export const cleanupUserScoring = async (userScoringId: string): Promise<boolean> => {
  const result = await prisma.userScoring.deleteMany({ where: { id: userScoringId } });
  return result.count > 0;
};
