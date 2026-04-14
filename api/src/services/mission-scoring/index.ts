import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import { missionScoringEnrichmentInclude, toScoringInputValues } from "@/services/mission-scoring/data";

const LOG_PREFIX = "[mission-scoring]";

export const missionScoringService = {
  async score(params: { missionId: string; missionEnrichmentId?: string; force?: boolean }) {
    const enrichment = await missionEnrichmentRepository.findFirst({
      where: {
        ...(params.missionEnrichmentId ? { id: params.missionEnrichmentId } : {}),
        missionId: params.missionId,
        status: "completed",
      },
      orderBy: { createdAt: "desc" },
      include: missionScoringEnrichmentInclude,
    });

    if (!enrichment) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${params.missionEnrichmentId ?? "latest"} — completed enrichment not found`);
      return;
    }

    const enrichmentId = enrichment.id;

    const existingScoring = await missionScoringRepository.findUnique({
      where: {
        missionId_missionEnrichmentId: {
          missionId: params.missionId,
          missionEnrichmentId: enrichmentId,
        },
      },
    });

    if (existingScoring && !params.force) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — scoring already exists`);
      return;
    }

    if (enrichment.values.length === 0 && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — no enrichment values to score`);
      return;
    }

    const inputValues = toScoringInputValues(enrichment);
    const result = computeMissionScoringValues(inputValues);

    if (result.values.length === 0 && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — no scoring values produced`);
      return;
    }

    await missionScoringRepository.replaceForEnrichment({
      missionId: params.missionId,
      missionEnrichmentId: enrichmentId,
      values: result.values.map((value) => ({
        missionEnrichmentValueId: value.missionEnrichmentValueId,
        taxonomyValueId: value.taxonomyValueId,
        score: value.score,
      })),
    });

    console.log(
      `${LOG_PREFIX} mission=${params.missionId} enrichment=${enrichmentId} completed — ${result.values.length} value(s) persisted, ${result.ignored.length} ignored`
    );
  },
};

export default missionScoringService;
