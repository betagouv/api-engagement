import { ENRICHABLE_DIMENSIONS, TAXONOMY } from "@engagement/taxonomy";
import { Prisma } from "@/db/core";
import { generateObject } from "ai";

import { missionRepository } from "@/repositories/mission";
import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { taxonomyRepository } from "@/repositories/taxonomy";
import { CONFIDENCE_THRESHOLD, CURRENT_PROMPT_VERSION, LLM_MAX_RETRIES } from "./config";
import { validateEnrichmentClassifications, type ClassificationInput, type TaxonomyLookup } from "./parser";
import { buildMissionBlock, buildTaxonomyBlock, PROMPT_REGISTRY } from "./prompts";
import type { MissionForPrompt, TaxonomyForPrompt } from "./prompts/types";

const LOG_PREFIX = "[mission-enrichment]";

type DimensionWithValues = { key: string; type: string; label: string; values: Array<{ key: string; id: string | null; label: string }> };

const buildTaxonomyLookup = (taxonomies: DimensionWithValues[]): TaxonomyLookup => {
  const lookup: TaxonomyLookup = new Map();
  for (const taxonomy of taxonomies) {
    const values = new Map<string, { taxonomyValueId: string | null }>();
    for (const val of taxonomy.values) {
      values.set(val.key, { taxonomyValueId: val.id });
    }
    lookup.set(taxonomy.key, { type: taxonomy.type, values });
  }
  return lookup;
};

const missionInclude = {
  domain: { select: { name: true } },
  activities: { include: { activity: { select: { name: true } } } },
  publisherOrganization: {
    include: {
      organizationVerified: {
        select: { object: true, socialObject1: true, socialObject2: true },
      },
    },
  },
} satisfies Prisma.MissionInclude;

type MissionWithRelations = Prisma.MissionGetPayload<{ include: typeof missionInclude }>;

const toMissionForPrompt = (mission: MissionWithRelations): MissionForPrompt => {
  const org = mission.publisherOrganization;
  const verifiedOrg = org?.organizationVerified;

  return {
    title: mission.title,
    description: mission.description,
    tasks: mission.tasks,
    audience: mission.audience,
    softSkills: mission.softSkills,
    requirements: mission.requirements,
    tags: mission.tags,
    type: mission.type,
    remote: mission.remote,
    openToMinors: mission.openToMinors,
    reducedMobilityAccessible: mission.reducedMobilityAccessible,
    duration: mission.duration,
    startAt: mission.startAt,
    endAt: mission.endAt,
    schedule: mission.schedule,
    domainName: mission.domain?.name ?? null,
    activities: mission.activities.map((a: { activity: { name: string } }) => a.activity.name),
    organizationName: org?.name ?? null,
    organizationType: org?.type ?? null,
    organizationDescription: org?.description ?? null,
    organizationActions: org?.actions ?? [],
    organizationBeneficiaries: org?.beneficiaries ?? [],
    organizationParentOrganizations: org?.parentOrganizations ?? [],
    organizationObject: verifiedOrg?.object ?? null,
    organizationSocialObject1: verifiedOrg?.socialObject1 ?? null,
    organizationSocialObject2: verifiedOrg?.socialObject2 ?? null,
  };
};

const toTaxonomyForPrompt = (
  dimensions: Array<{
    key: string;
    label: string;
    type: string;
    values: Array<{ key: string; label: string }>;
  }>
): TaxonomyForPrompt =>
  dimensions.map((dim) => ({
    key: dim.key,
    label: dim.label,
    type: dim.type,
    values: dim.values.map((v) => ({ key: v.key, label: v.label })),
  }));

const getPackageTaxonomyDimensions = (): DimensionWithValues[] =>
  ENRICHABLE_DIMENSIONS.map((dimensionKey) => ({
    key: dimensionKey,
    label: TAXONOMY[dimensionKey].label,
    type: TAXONOMY[dimensionKey].type,
    values: Object.entries(TAXONOMY[dimensionKey].values)
      .filter(([, value]) => value.enrichable)
      .map(([valueKey, value]) => ({
        key: valueKey,
        id: null,
        label: value.label,
      })),
  }));

export const missionEnrichmentService = {
  async enrich(missionId: string, options: { force?: boolean } = {}) {
    // 1. Load mission (needed before idempotence check for updatedAt comparison)
    const mission = await missionRepository.findUnique({
      where: { id: missionId, deletedAt: null },
      include: missionInclude,
    });

    if (!mission) {
      console.log(`${LOG_PREFIX} skipping ${missionId} — not found or deleted`);
      return;
    }

    // 2. Idempotence: skip if a completed enrichment exists and mission hasn't changed,
    //    or if an in-flight enrichment (pending/processing) already exists for this version
    if (!options.force) {
      const existing = await missionEnrichmentRepository.findFirst({
        where: { missionId, promptVersion: CURRENT_PROMPT_VERSION, status: { in: ["completed", "pending", "processing"] } },
        orderBy: { createdAt: "desc" },
      });

      if (existing?.status === "completed" && mission.updatedAt <= existing.createdAt) {
        console.log(`${LOG_PREFIX} skipping ${missionId} — already enriched for ${CURRENT_PROMPT_VERSION}`);
        return;
      }

      if (existing?.status === "pending" || existing?.status === "processing") {
        console.log(`${LOG_PREFIX} skipping ${missionId} — enrichment already in-flight (${existing.status})`);
        return;
      }
    }

    // 3. Load taxonomy from package and optionally resolve legacy UUIDs for dual-write.
    const dimensions = getPackageTaxonomyDimensions();
    const prefixedKeys = dimensions.flatMap((dimension) => dimension.values.map((value) => `${dimension.key}.${value.key}`));
    const legacyValues = await taxonomyRepository.findManyLegacyValuesByPrefixedKeys(prefixedKeys);
    const legacyValueIdsByPrefixedKey = new Map(legacyValues.map((value) => [`${value.taxonomyKey}.${value.key}`, value.id] as const));

    for (const dimension of dimensions) {
      for (const value of dimension.values) {
        value.id = legacyValueIdsByPrefixedKey.get(`${dimension.key}.${value.key}`) ?? null;
      }
    }

    // 4. Create enrichment record (pending)
    // The partial unique index on (mission_id, prompt_version) WHERE status IN ('pending', 'processing')
    // enforces at DB level that no two concurrent workers can run for the same mission/version.
    // A P2002 here means another worker won the race — skip silently.
    let enrichment;
    try {
      enrichment = await missionEnrichmentRepository.create({
        data: { missionId, promptVersion: CURRENT_PROMPT_VERSION, status: "pending" },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        console.log(`${LOG_PREFIX} skipping ${missionId} — lost race to concurrent worker`);
        return;
      }
      throw error;
    }

    // Declared outside try/catch so the catch block can persist them on failure
    let llmResult: Awaited<ReturnType<typeof generateObject>> | undefined;

    try {
      // 5. Mark as processing
      await missionEnrichmentRepository.update({
        where: { id: enrichment.id },
        data: { status: "processing" },
      });

      // 6. Build prompts
      const promptVersion = PROMPT_REGISTRY[CURRENT_PROMPT_VERSION];
      const systemPrompt = promptVersion.buildSystemPrompt(buildTaxonomyBlock(toTaxonomyForPrompt(dimensions)));
      const userMessage = promptVersion.buildUserMessage(buildMissionBlock(toMissionForPrompt(mission)));

      // 7. Call LLM with structured output
      llmResult = await generateObject({
        model: promptVersion.MODEL,
        schema: promptVersion.ENRICHMENT_SCHEMA,
        system: systemPrompt,
        prompt: userMessage,
        maxRetries: LLM_MAX_RETRIES,
        temperature: promptVersion.TEMPERATURE,
      });

      const { inputTokens, outputTokens, totalTokens } = llmResult.usage;
      console.log(`${LOG_PREFIX} ${missionId}: LLM response received — tokens: ${inputTokens} in / ${outputTokens} out / ${totalTokens} total`);

      // 8. Normalize + validate classifications against taxonomy rules
      const { valid, skipped } = validateEnrichmentClassifications(
        (llmResult.object as { classifications: ClassificationInput[] }).classifications,
        buildTaxonomyLookup(dimensions),
        CONFIDENCE_THRESHOLD
      );

      if (skipped.length > 0) {
        console.warn(
          `${LOG_PREFIX} ${missionId}: ${skipped.length} classifications skipped`,
          skipped.map((s) => s.reason)
        );
      }

      // 9. Persist values + mark completed (atomic)
      const persistedValues = valid.map((v) => ({
        taxonomyValueId: v.taxonomyValueId,
        dimensionKey: v.dimension_key,
        valueKey: v.value_key,
        confidence: v.confidence,
        evidence: v.evidence,
      }));

      if (options.force) {
        await missionEnrichmentRepository.completeWithValuesAndDeletePrevious({
          enrichmentId: enrichment.id,
          missionId,
          promptVersion: CURRENT_PROMPT_VERSION,
          rawResponse: JSON.stringify(llmResult.object),
          tokenUsage: { inputTokens, outputTokens, totalTokens },
          values: persistedValues,
        });
      } else {
        await missionEnrichmentRepository.completeWithValues(enrichment.id, JSON.stringify(llmResult.object), { inputTokens, outputTokens, totalTokens }, persistedValues);
      }

      console.log(`${LOG_PREFIX} ${missionId}: enrichment completed — ${valid.length} values persisted`);
    } catch (error) {
      // NoObjectGeneratedError (schema validation failure) exposes the raw LLM text and usage
      // directly on the error — llmResult may never have been assigned in this case.
      const errPayload = error as { text?: string; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } };
      const rawResponse = llmResult ? JSON.stringify(llmResult.object) : (errPayload.text ?? null);
      const usage = llmResult?.usage ?? errPayload.usage;

      await missionEnrichmentRepository
        .update({
          where: { id: enrichment.id },
          data: {
            status: "failed",
            ...(rawResponse !== null && { rawResponse }),
            ...(usage && {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
            }),
          },
        })
        .catch((updateErr) => {
          console.error(`${LOG_PREFIX} ${missionId}: failed to update status to failed`, updateErr);
        });

      throw error;
    }

    // 10. Trigger scoring (outside try/catch — enrichment is already completed)
    // TODO
    // await asyncTaskBus.publish({ type: "mission.scoring", payload: { missionId } });
  },
};
