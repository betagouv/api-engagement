import dotenv from "dotenv";
dotenv.config();

import { pgConnected, pgDisconnect } from "@/db/postgres";
import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import { missionScoringEnrichmentInclude, toScoringInputValues } from "@/services/mission-scoring/data";

const main = async () => {
  const [, , missionId, missionEnrichmentId] = process.argv;

  if (!missionId || !missionEnrichmentId) {
    console.error("Usage: ts-node scripts/inspect-mission-scoring.ts <missionId> <missionEnrichmentId>");
    process.exit(1);
  }

  await pgConnected();

  try {
    const enrichment = await missionEnrichmentRepository.findFirst({
      where: {
        id: missionEnrichmentId,
        missionId,
        status: "completed",
      },
      include: missionScoringEnrichmentInclude,
    });

    if (!enrichment) {
      throw new Error(`Completed enrichment not found for mission=${missionId} enrichment=${missionEnrichmentId}`);
    }

    const inputValues = toScoringInputValues(enrichment);
    const result = computeMissionScoringValues(inputValues);
    const inputByMissionEnrichmentValueId = new Map(inputValues.map((value) => [value.missionEnrichmentValueId, value]));

    console.log(
      JSON.stringify(
        {
          missionId,
          missionEnrichmentId,
          inputValues,
          ignored: result.ignored,
          computedValues: result.values.map((value) => ({
            ...value,
            dimensionKey: inputByMissionEnrichmentValueId.get(value.missionEnrichmentValueId)?.dimensionKey ?? null,
            taxonomyValueKey: inputByMissionEnrichmentValueId.get(value.missionEnrichmentValueId)?.taxonomyValueKey ?? null,
          })),
        },
        null,
        2
      )
    );
  } finally {
    await pgDisconnect();
  }
};

main().catch(async (error) => {
  console.error("[inspect-mission-scoring] Fatal error:", error);
  await pgDisconnect();
  process.exit(1);
});
