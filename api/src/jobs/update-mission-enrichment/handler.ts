import { prisma } from "@/db/postgres";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionEnrichmentService } from "@/services/mission-enrichment";
import { JOB_ENRICH_SLEEP_MS } from "@/services/mission-enrichment/config";
import { MissionEnrichmentRateLimitError } from "@/services/mission-enrichment/errors";
import { CURRENT_PROMPT_VERSION, isPromptVersion, type PromptVersion } from "@/services/mission-enrichment/prompts";
import fs from "fs";
import { setTimeout as sleep } from "timers/promises";

const LOG_PREFIX = "[update-mission-enrichment-job]";

export interface UpdateMissionEnrichmentJobPayload {
  promptVersion?: PromptVersion;
  publisherId?: string;
  limit?: number;
  onlyMissing?: boolean; // ne traite que les missions sans aucun enrichment
  missionIds?: string[];
  missionIdsFile?: string;
}

export interface UpdateMissionEnrichmentJobResult extends JobResult {
  processed: number;
  failed: number;
}

export class UpdateMissionEnrichmentHandler implements BaseHandler<UpdateMissionEnrichmentJobPayload, UpdateMissionEnrichmentJobResult> {
  name = "Enrichissement des missions";

  async handle({ promptVersion, publisherId, limit, onlyMissing, missionIds, missionIdsFile }: UpdateMissionEnrichmentJobPayload = {}): Promise<UpdateMissionEnrichmentJobResult> {
    try {
      if (promptVersion !== undefined && !isPromptVersion(promptVersion)) {
        throw new Error(`Version de prompt inconnue : ${promptVersion}`);
      }
      const targetPromptVersion = promptVersion ?? CURRENT_PROMPT_VERSION;

      if (missionIds !== undefined && (!Array.isArray(missionIds) || missionIds.some((missionId) => typeof missionId !== "string"))) {
        throw new Error("missionIds doit être un tableau de chaînes de caractères");
      }
      if (missionIdsFile !== undefined && (typeof missionIdsFile !== "string" || missionIdsFile.trim() === "")) {
        throw new Error("missionIdsFile doit être un chemin de fichier non vide");
      }

      const hasFixedSelection = missionIds !== undefined || missionIdsFile !== undefined;
      const fixedMissionIds = [...(missionIds ?? []), ...(missionIdsFile ? fs.readFileSync(missionIdsFile, "utf-8").split(/\r?\n|,/) : [])].map((id) => id.trim()).filter(Boolean);
      const uniqueFixedMissionIds = [...new Set(fixedMissionIds)];

      if (hasFixedSelection && uniqueFixedMissionIds.length === 0) {
        throw new Error("La sélection fixe de missions est vide");
      }

      const baseWhere = {
        ...(publisherId ? { publisherId } : {}),
        deletedAt: null,
      };

      let missingMissions: { id: string }[] = [];
      let staleMissions: { id: string }[] = [];
      let missions: { id: string }[];

      if (hasFixedSelection) {
        const selectedMissions = await prisma.mission.findMany({
          where: { id: { in: uniqueFixedMissionIds }, deletedAt: null },
          select: { id: true },
        });
        const selectedMissionIds = new Set(selectedMissions.map((mission) => mission.id));
        const missingMissionIds = uniqueFixedMissionIds.filter((missionId) => !selectedMissionIds.has(missionId));

        if (missingMissionIds.length > 0) {
          throw new Error(`${missingMissionIds.length} mission IDs introuvables ou supprimés : ${missingMissionIds.join(", ")}`);
        }

        missions = uniqueFixedMissionIds.map((missionId) => ({ id: missionId }));
      } else {
        // Phase 1 — missions sans AUCUN enrichment (priorité absolue)
        missingMissions = await prisma.mission.findMany({
          where: { ...baseWhere, enrichments: { none: {} } },
          select: { id: true },
          take: limit,
          orderBy: { updatedAt: "desc" },
        });

        // Phase 2 — missions avec enrichment mais pas de la version courante "completed" (stock obsolète)
        if (!onlyMissing) {
          const remaining = limit !== undefined ? limit - missingMissions.length : undefined;
          if (remaining === undefined || remaining > 0) {
            staleMissions = await prisma.mission.findMany({
              where: {
                ...baseWhere,
                enrichments: {
                  some: {},
                  none: { promptVersion: targetPromptVersion, status: "completed" },
                },
              },
              select: { id: true },
              take: remaining,
              orderBy: { updatedAt: "desc" },
            });
          }
        }

        missions = [...missingMissions, ...staleMissions];
      }

      console.log(
        hasFixedSelection
          ? `${LOG_PREFIX} ${missions.length} missions to force enrich (fixed selection, version: ${targetPromptVersion})`
          : `${LOG_PREFIX} ${missions.length} missions to enrich ` +
              `(${missingMissions.length} sans enrichment + ${staleMissions.length} obsolètes, ` +
              `publisher: ${publisherId ?? "all"}, version: ${targetPromptVersion}, onlyMissing: ${onlyMissing ?? false})`
      );

      let processed = 0;
      let failed = 0;

      for (const mission of missions) {
        try {
          await missionEnrichmentService.enrich(mission.id, { force: hasFixedSelection, promptVersion: targetPromptVersion });
          processed++;
          console.log(`${LOG_PREFIX} [${processed}/${missions.length}] enriched ${mission.id}`);
        } catch (error) {
          failed++;
          const rateLimitDetails = error instanceof MissionEnrichmentRateLimitError ? error.details : undefined;
          console.error(`${LOG_PREFIX} failed to enrich ${mission.id}`, error, rateLimitDetails ?? {});
          if ((error as { name?: string })?.name !== "AI_NoObjectGeneratedError") {
            captureException(error, { extra: { missionId: mission.id, ...(rateLimitDetails ? { rateLimit: rateLimitDetails } : {}) } });
          }
        }

        await sleep(JOB_ENRICH_SLEEP_MS);
      }

      const message = `${processed} missions enrichies, ${failed} échecs (${hasFixedSelection ? "sélection fixe" : `publisher: ${publisherId ?? "all"}`}, version: ${targetPromptVersion})`;
      console.log(`${LOG_PREFIX} done — ${message}`);

      return { success: failed === 0, timestamp: new Date(), processed, failed, message };
    } catch (error) {
      captureException(error);
      return { success: false, timestamp: new Date(), processed: 0, failed: 0 };
    }
  }
}
