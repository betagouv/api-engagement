import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import { missionScoringEnrichmentInclude, toScoringInputValues } from "@/services/mission-scoring/data";

const LOG_PREFIX = "[mission-scoring]";

export const missionScoringService = {
  async score(params: { missionId: string; missionEnrichmentId: string; force?: boolean }) {
    const enrichment = await missionEnrichmentRepository.findFirst({
      where: {
        id: params.missionEnrichmentId,
        missionId: params.missionId,
        status: "completed",
      },
      include: missionScoringEnrichmentInclude,
    });

    if (!enrichment) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${params.missionEnrichmentId} — completed enrichment not found`);
      return;
    }

    const existingScoring = await missionScoringRepository.findUnique({
      where: {
        missionId_missionEnrichmentId: {
          missionId: params.missionId,
          missionEnrichmentId: params.missionEnrichmentId,
        },
      },
    });

    if (existingScoring && !params.force) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${params.missionEnrichmentId} — scoring already exists`);
      return;
    }

    if (enrichment.values.length === 0 && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${params.missionEnrichmentId} — no enrichment values to score`);
      return;
    }

    const inputValues = toScoringInputValues(enrichment);
    const result = computeMissionScoringValues(inputValues);

    if (result.values.length === 0 && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${params.missionEnrichmentId} — no scoring values produced`);
      return;
    }

    await missionScoringRepository.replaceForEnrichment({
      missionId: params.missionId,
      missionEnrichmentId: params.missionEnrichmentId,
      values: result.values.map((value) => ({
        missionEnrichmentValueId: value.missionEnrichmentValueId,
        taxonomyValueId: value.taxonomyValueId,
        score: value.score,
      })),
    });

    console.log(
      `${LOG_PREFIX} mission=${params.missionId} enrichment=${params.missionEnrichmentId} completed — ${result.values.length} value(s) persisted, ${result.ignored.length} ignored`
    );
  },
};

export default missionScoringService;
