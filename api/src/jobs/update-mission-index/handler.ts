import { prisma } from "@/db/postgres";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionIndexService } from "@/services/mission-index";

const LOG_PREFIX = "[update-mission-index-job]";
const DEFAULT_BATCH_SIZE = 50;

export interface UpdateMissionIndexJobPayload {
  publisherId?: string;
  limit?: number;
  batchSize?: number;
  dryRun?: boolean;
}

export interface UpdateMissionIndexJobResult extends JobResult {
  total: number;
  indexed: number;
  failed: number;
}

export class UpdateMissionIndexHandler implements BaseHandler<UpdateMissionIndexJobPayload, UpdateMissionIndexJobResult> {
  name = "Indexation Typesense des missions";

  async handle({ publisherId, limit, batchSize = DEFAULT_BATCH_SIZE, dryRun = false }: UpdateMissionIndexJobPayload = {}): Promise<UpdateMissionIndexJobResult> {
    try {
      const missions = await prisma.mission.findMany({
        where: {
          deletedAt: null,
          missionScorings: { some: {} },
          ...(publisherId ? { publisherId } : {}),
        },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });

      console.log(`${LOG_PREFIX} ${missions.length} missions à indexer (publisher: ${publisherId ?? "all"}, dryRun: ${dryRun})`);

      let indexed = 0;
      let failed = 0;

      for (let i = 0; i < missions.length; i += batchSize) {
        const batch = missions.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async ({ id }) => {
            try {
              if (!dryRun) {
                await missionIndexService.upsert(id);
              }
              indexed++;
            } catch (error) {
              failed++;
              console.error(`${LOG_PREFIX} failed to index mission=${id}`, error);
              captureException(error, { extra: { missionId: id } });
            }
          })
        );
        console.log(`${LOG_PREFIX} [${Math.min(i + batchSize, missions.length)}/${missions.length}] batch done`);
      }

      const message = `${indexed} missions indexées, ${failed} échecs${dryRun ? " (dry-run)" : ""}`;
      console.log(`${LOG_PREFIX} done — ${message}`);

      return { success: failed === 0, timestamp: new Date(), total: missions.length, indexed, failed, message };
    } catch (error) {
      captureException(error);
      return { success: false, timestamp: new Date(), total: 0, indexed: 0, failed: 0 };
    }
  }
}
