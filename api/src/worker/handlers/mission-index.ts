import { missionIndexService } from "@/services/mission-index";

export const handleMissionIndex = async (payload: { missionId: string; action: "upsert" | "delete" }) => {
  const startedAt = Date.now();
  console.log(`[mission.index] start missionId=${payload.missionId} action=${payload.action}`);

  try {
    if (payload.action === "delete") {
      await missionIndexService.delete(payload.missionId);
    } else {
      await missionIndexService.upsert(payload.missionId);
    }
    console.log(`[mission.index] done missionId=${payload.missionId} action=${payload.action} durationMs=${Date.now() - startedAt}`);
  } catch (error) {
    console.error(`[mission.index] failed missionId=${payload.missionId} action=${payload.action} durationMs=${Date.now() - startedAt}`);
    throw error;
  }
};
