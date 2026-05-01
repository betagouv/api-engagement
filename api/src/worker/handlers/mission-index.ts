import { missionIndexService } from "@/services/mission-index";

export const handleMissionIndex = async (payload: { missionId: string; action: "upsert" | "delete" }) => {
  console.log(`[mission.index] start missionId=${payload.missionId} action=${payload.action}`);
  if (payload.action === "delete") {
    await missionIndexService.delete(payload.missionId);
  } else {
    await missionIndexService.upsert(payload.missionId);
  }
  console.log(`[mission.index] done missionId=${payload.missionId} action=${payload.action}`);
};
