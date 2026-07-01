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
  onlyMissing?: boolean; // ne traite que les missions sans aucun enrichment
}

export interface UpdateMissionEnrichmentJobResult extends JobResult {
  processed: number;
  failed: number;
}

export class UpdateMissionEnrichmentHandler implements BaseHandler<UpdateMissionEnrichmentJobPayload, UpdateMissionEnrichmentJobResult> {
  name = "Enrichissement des missions";

  async handle({ publisherId, limit, onlyMissing }: UpdateMissionEnrichmentJobPayload = {}): Promise<UpdateMissionEnrichmentJobResult> {
    try {
      const baseWhere = {
        ...(publisherId ? { publisherId } : {}),
        deletedAt: null,
      };

      // Phase 1 — missions sans AUCUN enrichment (priorité absolue)
      const missingMissions = await prisma.mission.findMany({
        where: { ...baseWhere, enrichments: { none: {} } },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });

      // Phase 2 — missions avec enrichment mais pas de v3 "completed" (stock obsolète)
      let staleMissions: { id: string }[] = [];
      if (!onlyMissing) {
        const remaining = limit !== undefined ? limit - missingMissions.length : undefined;
        if (remaining === undefined || remaining > 0) {
          staleMissions = await prisma.mission.findMany({
            where: {
              ...baseWhere,
              enrichments: {
                some: {},
                none: { promptVersion: CURRENT_PROMPT_VERSION, status: "completed" },
              },
            },
            select: { id: true },
            take: remaining,
            orderBy: { updatedAt: "desc" },
          });
        }
      }

      const missions = [...missingMissions, ...staleMissions];

      console.log(
        `${LOG_PREFIX} ${missions.length} missions to enrich ` +
          `(${missingMissions.length} sans enrichment + ${staleMissions.length} obsolètes, ` +
          `publisher: ${publisherId ?? "all"}, version: ${CURRENT_PROMPT_VERSION}, onlyMissing: ${onlyMissing ?? false})`
      );

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
          if ((error as { name?: string })?.name !== "AI_NoObjectGeneratedError") {
            captureException(error, { extra: { missionId: mission.id } });
          }
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
