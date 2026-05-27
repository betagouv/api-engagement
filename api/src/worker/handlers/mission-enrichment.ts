import { missionEnrichmentService } from "@/services/mission-enrichment";
import { MissionEnrichmentRateLimitError } from "@/services/mission-enrichment/errors";
import { WorkerRetryableError } from "@/worker/errors";

export const handleMissionEnrichment = async (payload: { missionId: string; force?: boolean }) => {
  console.log(`[mission.enrichment] start missionId=${payload.missionId}`);
  try {
    await missionEnrichmentService.enrich(payload.missionId, { force: payload.force });
  } catch (error) {
    if (error instanceof MissionEnrichmentRateLimitError) {
      console.warn(`[mission.enrichment] rate limit missionId=${payload.missionId} — will be retried`);
      throw new WorkerRetryableError(`rate_limit missionId=${payload.missionId}`);
    }
    if ((error as { name?: string })?.name === "AI_NoObjectGeneratedError") {
      console.warn(`[mission.enrichment] AI_NoObjectGeneratedError missionId=${payload.missionId} — enrichment marked failed, not sent to Sentry`);
      return;
    }
    throw error;
  }
  console.log(`[mission.enrichment] done missionId=${payload.missionId}`);
};
