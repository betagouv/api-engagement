import { missionEnrichmentService } from "@/services/mission-enrichment";

export const handleMissionEnrichment = async (payload: { missionId: string; force?: boolean }) => {
  console.log(`[mission.enrichment] start missionId=${payload.missionId}`);
  await missionEnrichmentService.enrich(payload.missionId, { force: payload.force });
  console.log(`[mission.enrichment] done missionId=${payload.missionId}`);
};
