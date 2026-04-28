import { missionIndexService } from "@/services/mission-index";

export const handleMissionIndex = async (payload: { missionId: string; action: "upsert" | "delete" }) => {
  if (payload.action === "delete") {
    await missionIndexService.delete(payload.missionId);
  } else {
    await missionIndexService.upsert(payload.missionId);
  }
};
