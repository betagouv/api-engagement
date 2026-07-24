import { asyncTaskBus } from "@/services/async-task";
import { missionScoringService } from "@/services/mission-scoring";

export const handleMissionScoring = async (payload: { missionId: string; missionEnrichmentId?: string; force?: boolean }) => {
  console.log(`[mission.scoring] start missionId=${payload.missionId}`);
  await missionScoringService.score(payload);
  console.log(`[mission.scoring] done missionId=${payload.missionId} → queuing mission.diffusion`);
  await asyncTaskBus.publish({ type: "mission.diffusion", payload: { missionId: payload.missionId } });
};
