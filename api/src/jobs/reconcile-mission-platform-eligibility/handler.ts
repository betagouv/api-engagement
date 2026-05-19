import { prisma } from "@/db/postgres";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { asyncTaskBus } from "@/services/async-task";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/config";
import { buildMissionPlatformEligibilityWhere } from "@/services/mission-platform-eligibility";

const LOG_PREFIX = "[reconcile-mission-platform-eligibility-job]";
const DEFAULT_BATCH_SIZE = 50;

export interface ReconcileMissionPlatformEligibilityJobPayload {
  publisherId?: string;
  limit?: number;
  batchSize?: number;
  dryRun?: boolean;
  force?: boolean;
}

export interface ReconcileMissionPlatformEligibilityJobResult extends JobResult {
  eligibleEnrichmentQueued: number;
  ineligibleScoringsDeleted: number;
  ineligibleIndexDeletesQueued: number;
  failed: number;
}

const getNextTake = (params: { limit?: number; processed: number; batchSize: number }): number => {
  if (params.limit === undefined) {
    return params.batchSize;
  }
  return Math.max(0, Math.min(params.batchSize, params.limit - params.processed));
};

export class ReconcileMissionPlatformEligibilityHandler
  implements BaseHandler<ReconcileMissionPlatformEligibilityJobPayload, ReconcileMissionPlatformEligibilityJobResult>
{
  name = "Réconciliation de l'éligibilité Plateforme des missions";

  async handle({
    publisherId,
    limit,
    batchSize = DEFAULT_BATCH_SIZE,
    dryRun = false,
    force = false,
  }: ReconcileMissionPlatformEligibilityJobPayload = {}): Promise<ReconcileMissionPlatformEligibilityJobResult> {
    if (batchSize <= 0) {
      batchSize = DEFAULT_BATCH_SIZE;
    }

    let eligibleEnrichmentQueued = 0;
    let ineligibleScoringsDeleted = 0;
    let ineligibleIndexDeletesQueued = 0;
    let failed = 0;
    let eligibleProcessed = 0;
    let ineligibleProcessed = 0;

    try {
      const eligibilityWhere = buildMissionPlatformEligibilityWhere();

      console.log(`${LOG_PREFIX} starting (publisher: ${publisherId ?? "all"}, dryRun: ${dryRun}, force: ${force}, limit: ${limit ?? "none"}, batchSize: ${batchSize})`);

      let eligibleCursor: string | undefined;
      while (true) {
        const take = getNextTake({ limit, processed: eligibleProcessed, batchSize });
        if (take <= 0) {
          break;
        }

        const missions = await prisma.mission.findMany({
          where: {
            ...(publisherId ? { publisherId } : {}),
            ...eligibilityWhere,
            deletedAt: null,
            statusCode: "ACCEPTED",
            enrichments: {
              none: {
                promptVersion: CURRENT_PROMPT_VERSION,
                status: { in: ["completed", "pending", "processing"] },
              },
            },
          },
          select: { id: true },
          take,
          ...(eligibleCursor ? { cursor: { id: eligibleCursor }, skip: 1 } : {}),
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        });

        if (!missions.length) {
          break;
        }

        eligibleCursor = missions[missions.length - 1].id;
        eligibleProcessed += missions.length;

        await Promise.all(
          missions.map(async ({ id }) => {
            try {
              if (!dryRun) {
                await asyncTaskBus.publish({
                  type: "mission.enrichment",
                  payload: { missionId: id, ...(force ? { force: true } : {}) },
                });
              }
              eligibleEnrichmentQueued++;
            } catch (error) {
              failed++;
              console.error(`${LOG_PREFIX} failed to enqueue enrichment mission=${id}`, error);
              captureException(error, { extra: { missionId: id } });
            }
          })
        );

        console.log(`${LOG_PREFIX} eligible enrichment batch done — ${eligibleEnrichmentQueued} queued${dryRun ? " (dry-run)" : ""}`);
      }

      let ineligibleSkip = 0;
      while (true) {
        const take = getNextTake({ limit, processed: ineligibleProcessed, batchSize });
        if (take <= 0) {
          break;
        }

        const scoringRows = await missionScoringRepository.findMany({
          where: {
            mission: {
              ...(publisherId ? { publisherId } : {}),
              NOT: eligibilityWhere,
            },
          },
          select: { missionId: true },
          distinct: ["missionId"],
          take,
          ...(dryRun ? { skip: ineligibleSkip } : {}),
          orderBy: { missionId: "asc" },
        });

        if (!scoringRows.length) {
          break;
        }

        const missionIds = scoringRows.map(({ missionId }) => missionId);
        ineligibleProcessed += scoringRows.length;
        try {
          if (!dryRun) {
            const result = await missionScoringRepository.deleteMany({ where: { missionId: { in: missionIds } } });
            ineligibleScoringsDeleted += result.count;
          } else {
            ineligibleScoringsDeleted += await missionScoringRepository.count({ where: { missionId: { in: missionIds } } });
            ineligibleSkip += scoringRows.length;
          }
        } catch (error) {
          failed += missionIds.length;
          console.error(`${LOG_PREFIX} failed to delete scorings for missions=${missionIds.join(",")}`, error);
          captureException(error, { extra: { missionIds } });
          continue;
        }

        await Promise.all(
          missionIds.map(async (missionId) => {
            try {
              if (!dryRun) {
                await asyncTaskBus.publish({ type: "mission.index", payload: { missionId, action: "delete" } });
              }
              ineligibleIndexDeletesQueued++;
            } catch (error) {
              failed++;
              console.error(`${LOG_PREFIX} failed to enqueue index delete mission=${missionId}`, error);
              captureException(error, { extra: { missionId } });
            }
          })
        );

        console.log(`${LOG_PREFIX} ineligible purge batch done — ${ineligibleScoringsDeleted} scorings deleted, ${ineligibleIndexDeletesQueued} index deletes queued${dryRun ? " (dry-run)" : ""}`);
      }

      const message =
        `${eligibleEnrichmentQueued} enrichissements enqueued, ` +
        `${ineligibleScoringsDeleted} scorings supprimés, ` +
        `${ineligibleIndexDeletesQueued} suppressions d'index enqueued, ${failed} échecs${dryRun ? " (dry-run)" : ""}`;

      console.log(`${LOG_PREFIX} done — ${message}`);

      return {
        success: failed === 0,
        timestamp: new Date(),
        eligibleEnrichmentQueued,
        ineligibleScoringsDeleted,
        ineligibleIndexDeletesQueued,
        failed,
        message,
      };
    } catch (error) {
      captureException(error);
      return {
        success: false,
        timestamp: new Date(),
        eligibleEnrichmentQueued,
        ineligibleScoringsDeleted,
        ineligibleIndexDeletesQueued,
        failed,
      };
    }
  }
}
