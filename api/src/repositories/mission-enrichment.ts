import { MissionEnrichment, MissionEnrichmentValue, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionEnrichmentRepository = {
  create(params: Prisma.MissionEnrichmentCreateArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.create(params);
  },

  /**
   * Reserves (or reuses) the single enrichment row for a (mission, version) for a run.
   *
   * Conditional atomic upsert: the unique constraint (mission_id, prompt_version) ensures there is
   * only one row; the `DO UPDATE ... WHERE status NOT IN (‘pending’,'processing')` only “takes” the
   * row if no run is already in progress. Returns the reserved ID, or `null` if another worker
   * already holds the run (concurrency) — the caller must then stop.
   */
  async claimForRun(params: { missionId: string; promptVersion: string }): Promise<string | null> {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "mission_enrichment" ("id", "mission_id", "prompt_version", "status", "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${params.missionId}, ${params.promptVersion}, 'processing', now(), now())
      ON CONFLICT ("mission_id", "prompt_version")
      DO UPDATE SET
        "status" = 'processing',
        "completed_at" = NULL,
        "raw_response" = NULL,
        "input_tokens" = NULL,
        "output_tokens" = NULL,
        "total_tokens" = NULL,
        "updated_at" = now()
      WHERE "mission_enrichment"."status" NOT IN ('pending', 'processing')
      RETURNING "id"
    `;

    return rows[0]?.id ?? null;
  },

  findFirst<T extends Prisma.MissionEnrichmentFindFirstArgs>(
    params: Prisma.SelectSubset<T, Prisma.MissionEnrichmentFindFirstArgs>
  ): Promise<Prisma.MissionEnrichmentGetPayload<T> | null> {
    return prisma.missionEnrichment.findFirst(params) as Promise<Prisma.MissionEnrichmentGetPayload<T> | null>;
  },

  update(params: Prisma.MissionEnrichmentUpdateArgs): Promise<MissionEnrichment> {
    return prisma.missionEnrichment.update(params);
  },

  deleteMany(params: Prisma.MissionEnrichmentDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.missionEnrichment.deleteMany(params);
  },

  /**
   * Mark the enrichment as completed and replace its values.
   *
   * Since the enrichment line is reused from one run to the next (see claimForRun), we first
   * clear its old values before inserting the new ones, all within a transaction.
   */
  async completeWithValues(
    enrichmentId: string,
    rawResponse: string,
    tokenUsage: { inputTokens: number | undefined; outputTokens: number | undefined; totalTokens: number | undefined },
    values: Omit<Prisma.MissionEnrichmentValueUncheckedCreateInput, "enrichmentId">[]
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.missionEnrichmentValue.deleteMany({ where: { enrichmentId } });

      if (values.length > 0) {
        await tx.missionEnrichmentValue.createMany({
          data: values.map((value) => ({ ...value, enrichmentId })) as Prisma.MissionEnrichmentValueCreateManyInput[],
        });
      }
      await tx.missionEnrichment.update({
        where: { id: enrichmentId },
        data: {
          status: "completed",
          rawResponse,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          totalTokens: tokenUsage.totalTokens,
          completedAt: new Date(),
        },
      });
    });
  },
};

export const missionEnrichmentValueRepository = {
  findMany(params: Prisma.MissionEnrichmentValueFindManyArgs = {}): Promise<MissionEnrichmentValue[]> {
    return prisma.missionEnrichmentValue.findMany(params);
  },
};
