import { prisma } from "@/db/postgres";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionEnrichmentService } from "@/services/mission-enrichment";
import { DEFAULT_ENRICH_CONCURRENCY, DEFAULT_ENRICH_RPM } from "@/services/mission-enrichment/config";
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
  concurrency?: number; // nombre de missions traitées en parallèle (défaut DEFAULT_ENRICH_CONCURRENCY)
  rpm?: number; // plafond de calls LLM par minute, respecte le TPM du provider (défaut DEFAULT_ENRICH_RPM)
}

export interface UpdateMissionEnrichmentJobResult extends JobResult {
  processed: number;
  failed: number;
}

export class UpdateMissionEnrichmentHandler implements BaseHandler<UpdateMissionEnrichmentJobPayload, UpdateMissionEnrichmentJobResult> {
  name = "Enrichissement des missions";

  async handle({
    promptVersion,
    publisherId,
    limit,
    onlyMissing,
    missionIds,
    missionIdsFile,
    concurrency,
    rpm,
  }: UpdateMissionEnrichmentJobPayload = {}): Promise<UpdateMissionEnrichmentJobResult> {
    try {
      if (promptVersion !== undefined && !isPromptVersion(promptVersion)) {
        throw new Error(`Version de prompt inconnue : ${promptVersion}`);
      }
      const targetPromptVersion = promptVersion ?? CURRENT_PROMPT_VERSION;

      if (concurrency !== undefined && (!Number.isInteger(concurrency) || concurrency < 1)) {
        throw new Error("concurrency doit être un entier >= 1");
      }
      if (rpm !== undefined && (typeof rpm !== "number" || !Number.isFinite(rpm) || rpm <= 0)) {
        throw new Error("rpm doit être un nombre > 0");
      }
      const workerCount = concurrency ?? DEFAULT_ENRICH_CONCURRENCY;
      const targetRpm = rpm ?? DEFAULT_ENRICH_RPM;

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
          ? `${LOG_PREFIX} ${missions.length} missions to force enrich (fixed selection, version: ${targetPromptVersion}, concurrency: ${workerCount}, rpm: ${targetRpm})`
          : `${LOG_PREFIX} ${missions.length} missions to enrich ` +
              `(${missingMissions.length} sans enrichment + ${staleMissions.length} obsolètes, ` +
              `publisher: ${publisherId ?? "all"}, version: ${targetPromptVersion}, onlyMissing: ${onlyMissing ?? false}, ` +
              `concurrency: ${workerCount}, rpm: ${targetRpm})`
      );

      let processed = 0;
      let failed = 0;

      // Rate limiter à intervalle minimum : espace les DÉPARTS de calls d'au moins (60000 / rpm) ms.
      // C'est lui qui gouverne le débit (respect du TPM du provider) ; la concurrence ne sert qu'à
      // avoir assez de requêtes en vol pour atteindre cet intervalle malgré la latence par call.
      const minIntervalMs = 60000 / targetRpm;
      let nextSlot = 0;
      const acquireSlot = async (): Promise<void> => {
        const now = Date.now();
        const slot = Math.max(now, nextSlot);
        nextSlot = slot + minIntervalMs;
        const wait = slot - now;
        if (wait > 0) {
          await sleep(wait);
        }
      };

      // Pool de workers concurrents partageant un curseur sur `missions`. La sûreté vis-à-vis d'un
      // double-traitement est garantie côté DB par `claimForRun` (réservation atomique de la ligne
      // d'enrichment), donc plusieurs workers peuvent avancer en parallèle sans coordination ici.
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (true) {
          const index = cursor++;
          if (index >= missions.length) {
            return;
          }
          const mission = missions[index];

          await acquireSlot();

          try {
            await missionEnrichmentService.enrich(mission.id, { force: hasFixedSelection, promptVersion: targetPromptVersion });
            processed++;
            console.log(`${LOG_PREFIX} [${processed + failed}/${missions.length}] enriched ${mission.id}`);
          } catch (error) {
            failed++;
            const rateLimitDetails = error instanceof MissionEnrichmentRateLimitError ? error.details : undefined;
            console.error(`${LOG_PREFIX} failed to enrich ${mission.id}`, error, rateLimitDetails ?? {});
            if ((error as { name?: string })?.name !== "AI_NoObjectGeneratedError") {
              captureException(error, { extra: { missionId: mission.id, ...(rateLimitDetails ? { rateLimit: rateLimitDetails } : {}) } });
            }
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(workerCount, missions.length) }, () => worker()));

      const message = `${processed} missions enrichies, ${failed} échecs (${hasFixedSelection ? "sélection fixe" : `publisher: ${publisherId ?? "all"}`}, version: ${targetPromptVersion})`;
      console.log(`${LOG_PREFIX} done — ${message}`);

      return { success: failed === 0, timestamp: new Date(), processed, failed, message };
    } catch (error) {
      captureException(error);
      return { success: false, timestamp: new Date(), processed: 0, failed: 0 };
    }
  }
}
