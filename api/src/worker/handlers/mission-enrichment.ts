import { missionEnrichmentService } from "@/services/mission-enrichment";

export const handleMissionEnrichment = async (payload: { missionId: string; force?: boolean }) => {
  await missionEnrichmentService.enrich(payload.missionId, { force: payload.force });
};
