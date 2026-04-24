import { prisma } from "@/db/postgres";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionScoringService } from "@/services/mission-scoring";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/config";

const LOG_PREFIX = "[update-mission-scoring-job]";

export interface UpdateMissionScoringJobPayload {
  promptVersion?: string;
  publisherId?: string;
  limit?: number;
  force?: boolean;
}

export interface UpdateMissionScoringJobResult extends JobResult {
  processed: number;
  failed: number;
}

export class UpdateMissionScoringHandler implements BaseHandler<UpdateMissionScoringJobPayload, UpdateMissionScoringJobResult> {
  name = "Scoring des missions";

  async handle({ promptVersion, publisherId, limit, force }: UpdateMissionScoringJobPayload = {}): Promise<UpdateMissionScoringJobResult> {
    const version = promptVersion ?? CURRENT_PROMPT_VERSION;

    try {
      const enrichments = await prisma.missionEnrichment.findMany({
        where: {
          promptVersion: version,
          status: "completed",
          mission: {
            deletedAt: null,
            ...(publisherId ? { publisherId } : {}),
          },
          ...(!force
            ? {
                missionScorings: {
                  none: {},
                },
              }
            : {}),
        },
        select: { id: true, missionId: true },
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      console.log(
        `${LOG_PREFIX} ${enrichments.length} enrichments to score (publisher: ${publisherId ?? "all"}, version: ${version}, force: ${force ?? false})`
      );

      let processed = 0;
      let failed = 0;

      for (const enrichment of enrichments) {
        try {
          await missionScoringService.score({ missionId: enrichment.missionId, missionEnrichmentId: enrichment.id, force });
          processed++;
          console.log(`${LOG_PREFIX} [${processed}/${enrichments.length}] scored mission=${enrichment.missionId}`);
        } catch (error) {
          failed++;
          console.error(`${LOG_PREFIX} failed to score mission=${enrichment.missionId} enrichment=${enrichment.id}`, error);
          captureException(error, { extra: { missionId: enrichment.missionId, missionEnrichmentId: enrichment.id } });
        }
      }

      const message = `${processed} missions scorées, ${failed} échecs (publisher: ${publisherId ?? "all"}, version: ${version})`;
      console.log(`${LOG_PREFIX} done — ${message}`);

      return { success: failed === 0, timestamp: new Date(), processed, failed, message };
    } catch (error) {
      captureException(error);
      return { success: false, timestamp: new Date(), processed: 0, failed: 0 };
    }
  }
}
