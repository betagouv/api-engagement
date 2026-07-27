import { asyncTaskBus } from "@/services/async-task";
import { missionDiffusionService } from "@/services/mission-diffusion";

export const handleMissionDiffusion = async (payload: { missionId: string }) => {
  console.log(`[mission.diffusion] start missionId=${payload.missionId}`);
  const result = await missionDiffusionService.rebuildForMission(payload.missionId);
  console.log(
    `[mission.diffusion] done missionId=${payload.missionId} desired=${result.desired} added=${result.added} removed=${result.removed} → queuing mission.index`
  );
  await asyncTaskBus.publish({ type: "mission.index", payload: { missionId: payload.missionId, action: "upsert" } });
};
