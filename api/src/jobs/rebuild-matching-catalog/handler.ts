import { randomUUID } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/db/postgres";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { matchingCatalogRepository } from "@/repositories/matching-catalog";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";

const payloadSchema = z
  .object({
    promptVersion: z.string().min(1).default(CURRENT_PROMPT_VERSION),
    batchSize: z.number().int().min(1).max(1000).default(250),
    dryRun: z.boolean().default(false),
  })
  .strict();

type Payload = z.input<typeof payloadSchema>;
interface Result extends JobResult {
  processed: number;
  batches: number;
  ready: boolean;
  dryRun: boolean;
}

export class RebuildMatchingCatalogHandler implements BaseHandler<Payload, Result> {
  name = "Reconstruction du catalogue de matching";

  async handle(payload: Payload = {}): Promise<Result> {
    const { promptVersion, batchSize, dryRun } = payloadSchema.parse(payload);
    const buildId = randomUUID();
    let processed = 0;
    let batches = 0;
    let afterId: string | undefined;
    if (!dryRun) {
      await matchingCatalogRepository.beginBuild(promptVersion, buildId);
    }
    try {
      while (true) {
        const rows = await prisma.missionScoring.findMany({
          where: { missionEnrichment: { promptVersion }, ...(afterId ? { id: { gt: afterId } } : {}) },
          orderBy: { id: "asc" },
          take: batchSize,
          select: { id: true },
        });
        if (!rows.length) {
          break;
        }
        if (!dryRun) {
          await matchingCatalogRepository.rebuildBatch(rows.map(({ id }) => id));
        }
        processed += rows.length;
        batches++;
        afterId = rows[rows.length - 1].id;
        console.log(`[rebuild-matching-catalog] ${processed} scorings, ${batches} lots${dryRun ? " (dry-run)" : ""}`);
      }
      const ready = !dryRun && (await matchingCatalogRepository.finishBuild(promptVersion, buildId));
      return {
        success: dryRun || ready,
        timestamp: new Date(),
        processed,
        batches,
        ready,
        dryRun,
        message: `${processed} scorings parcourus, ${batches} lots ; ${dryRun ? "simulation sans écriture" : ready ? "catalogue prêt" : "construction devenue inactive"}`,
      };
    } catch (error) {
      if (!dryRun) {
        await matchingCatalogRepository.abortBuild(promptVersion, buildId);
      }
      throw error;
    }
  }
}
