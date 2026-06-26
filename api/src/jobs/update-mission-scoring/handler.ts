import { prisma } from "@/db/postgres";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { asyncTaskBus } from "@/services/async-task";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/config";
import { missionScoringService } from "@/services/mission-scoring";

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

type MissionEnrichmentCandidate = {
  id: string;
  missionId: string;
};

export const selectActiveEnrichments = <T extends MissionEnrichmentCandidate>(enrichments: T[], limit?: number): T[] => {
  const selected: T[] = [];
  const selectedMissionIds = new Set<string>();

  for (const enrichment of enrichments) {
    if (limit !== undefined && selected.length >= limit) {
      break;
    }
    if (selectedMissionIds.has(enrichment.missionId)) {
      continue;
    }

    selected.push(enrichment);
    selectedMissionIds.add(enrichment.missionId);
  }

  return selected;
};

export class UpdateMissionScoringHandler implements BaseHandler<UpdateMissionScoringJobPayload, UpdateMissionScoringJobResult> {
  name = "Scoring des missions";

  async handle({ promptVersion, publisherId, limit, force }: UpdateMissionScoringJobPayload = {}): Promise<UpdateMissionScoringJobResult> {
    const promptVersionFilter: { promptVersion?: string } = promptVersion !== undefined ? { promptVersion } : force ? {} : { promptVersion: CURRENT_PROMPT_VERSION };
    const versionLabel = promptVersionFilter.promptVersion ?? "all";

    try {
      const enrichmentCandidates = await prisma.missionEnrichment.findMany({
        where: {
          ...promptVersionFilter,
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
        orderBy: { createdAt: "desc" },
      });
      const enrichments = selectActiveEnrichments(enrichmentCandidates, limit);

      console.log(
        `${LOG_PREFIX} ${enrichments.length} active enrichments to score (${enrichmentCandidates.length} candidate(s), publisher: ${publisherId ?? "all"}, version: ${versionLabel}, force: ${force ?? false})`
      );

      let processed = 0;
      let failed = 0;

      for (const enrichment of enrichments) {
        try {
          await missionScoringService.score({ missionId: enrichment.missionId, missionEnrichmentId: enrichment.id, force });
          await asyncTaskBus.publish({ type: "mission.index", payload: { missionId: enrichment.missionId, action: "upsert" } });
          processed++;
          console.log(`${LOG_PREFIX} [${processed}/${enrichments.length}] scored mission=${enrichment.missionId}`);
        } catch (error) {
          failed++;
          console.error(`${LOG_PREFIX} failed to score mission=${enrichment.missionId} enrichment=${enrichment.id}`, error);
          captureException(error, { extra: { missionId: enrichment.missionId, missionEnrichmentId: enrichment.id } });
        }
      }

      const message = `${processed} missions scorées, ${failed} échecs (publisher: ${publisherId ?? "all"}, version: ${versionLabel})`;
      console.log(`${LOG_PREFIX} done — ${message}`);

      return { success: failed === 0, timestamp: new Date(), processed, failed, message };
    } catch (error) {
      captureException(error);
      return { success: false, timestamp: new Date(), processed: 0, failed: 0 };
    }
  }
}
