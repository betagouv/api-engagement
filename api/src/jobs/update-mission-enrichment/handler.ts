import { prisma } from "@/db/postgres";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionEnrichmentService } from "@/services/mission-enrichment";
import { CURRENT_PROMPT_VERSION, JOB_ENRICH_SLEEP_MS } from "@/services/mission-enrichment/config";
import { setTimeout as sleep } from "timers/promises";

const LOG_PREFIX = "[update-mission-enrichment-job]";

export interface UpdateMissionEnrichmentJobPayload {
  publisherId?: string;
  limit?: number;
}

export interface UpdateMissionEnrichmentJobResult extends JobResult {
  processed: number;
  failed: number;
}

export class UpdateMissionEnrichmentHandler implements BaseHandler<UpdateMissionEnrichmentJobPayload, UpdateMissionEnrichmentJobResult> {
  name = "Enrichissement des missions";

  async handle({ publisherId, limit }: UpdateMissionEnrichmentJobPayload = {}): Promise<UpdateMissionEnrichmentJobResult> {
    try {
      const missions = await prisma.mission.findMany({
        where: {
          ...(publisherId ? { publisherId } : {}),
          deletedAt: null,
          enrichments: {
            none: { promptVersion: CURRENT_PROMPT_VERSION, status: "completed" },
          },
        },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });

      console.log(`${LOG_PREFIX} ${missions.length} missions to enrich (publisher: ${publisherId ?? "all"}, version: ${CURRENT_PROMPT_VERSION})`);

      let processed = 0;
      let failed = 0;

      for (const mission of missions) {
        try {
          await missionEnrichmentService.enrich(mission.id);
          processed++;
          console.log(`${LOG_PREFIX} [${processed}/${missions.length}] enriched ${mission.id}`);
        } catch (error) {
          failed++;
          console.error(`${LOG_PREFIX} failed to enrich ${mission.id}`, error);
          captureException(error, { extra: { missionId: mission.id } });
        }

        await sleep(JOB_ENRICH_SLEEP_MS);
      }

      const message = `${processed} missions enrichies, ${failed} échecs (publisher: ${publisherId ?? "all"})`;
      console.log(`${LOG_PREFIX} done — ${message}`);

      return { success: failed === 0, timestamp: new Date(), processed, failed, message };
    } catch (error) {
      captureException(error);
      return { success: false, timestamp: new Date(), processed: 0, failed: 0 };
    }
  }
}
