import { asyncTaskBus } from "@/services/async-task";
import { missionScoringService } from "@/services/mission-scoring";

export const handleMissionScoring = async (payload: { missionId: string; missionEnrichmentId?: string; force?: boolean }) => {
  console.log(`[mission.scoring] start missionId=${payload.missionId}`);
  await missionScoringService.score(payload);
  console.log(`[mission.scoring] done missionId=${payload.missionId} → queuing mission.index`);
  await asyncTaskBus.publish({ type: "mission.index", payload: { missionId: payload.missionId, action: "upsert" } });
};
