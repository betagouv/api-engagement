import { asyncTaskBus } from "@/services/async-task";
import { missionScoringService } from "@/services/mission-scoring";

export const handleMissionScoring = async (payload: { missionId: string; missionEnrichmentId?: string; force?: boolean }) => {
  await missionScoringService.score(payload);
  await asyncTaskBus.publish({ type: "mission.index", payload: { missionId: payload.missionId, action: "upsert" } });
};
