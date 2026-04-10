import { missionScoringService } from "@/services/mission-scoring";

export const handleMissionScoring = async (payload: { missionId: string; missionEnrichmentId: string; force?: boolean }) => {
  await missionScoringService.score(payload);
};
