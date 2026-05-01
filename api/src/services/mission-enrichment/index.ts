import { Prisma } from "@/db/core";
import { ENRICHABLE_TAXONOMIES, TAXONOMY } from "@engagement/taxonomy";
import { generateObject } from "ai";

import { missionRepository } from "@/repositories/mission";
import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { asyncTaskBus } from "@/services/async-task";
import { CONFIDENCE_THRESHOLD, CURRENT_PROMPT_VERSION, LLM_MAX_RETRIES } from "./config";
import { validateEnrichmentClassifications, type ClassificationInput, type TaxonomyLookup } from "./parser";
import { buildMissionBlock, buildTaxonomyBlock, PROMPT_REGISTRY } from "./prompts";
import type { MissionForPrompt, TaxonomyForPrompt } from "./prompts/types";

const LOG_PREFIX = "[mission-enrichment]";

type TaxonomyWithValues = { key: string; type: string; label: string; values: Array<{ key: string; label: string }> };

const buildTaxonomyLookup = (taxonomies: TaxonomyWithValues[]): TaxonomyLookup => {
  const lookup: TaxonomyLookup = new Map();
  for (const taxonomy of taxonomies) {
    const values = new Set<string>();
    for (const val of taxonomy.values) {
      values.add(val.key);
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
  taxonomies: Array<{
    key: string;
    label: string;
    type: string;
    values: Array<{ key: string; label: string }>;
  }>
): TaxonomyForPrompt =>
  taxonomies.map((taxonomy) => ({
    key: taxonomy.key,
    label: taxonomy.label,
    type: taxonomy.type,
    values: taxonomy.values.map((value) => ({ key: value.key, label: value.label })),
  }));

const getTaxonomies = (): TaxonomyWithValues[] =>
  ENRICHABLE_TAXONOMIES.map((taxonomyKey) => ({
    key: taxonomyKey,
    label: TAXONOMY[taxonomyKey].label,
    type: TAXONOMY[taxonomyKey].type,
    values: Object.entries(TAXONOMY[taxonomyKey].values)
      .filter(([, value]) => value.enrichable)
      .map(([valueKey, value]) => ({
        key: valueKey,
        label: value.label,
      })),
  }));

export const missionEnrichmentService = {
  async enrich(missionId: string, options: { force?: boolean } = {}) {
    // 1. Load mission (needed before idempotence check for updatedAt comparison)
    const mission = await missionRepository.findUnique({
      where: { id: missionId },
      include: missionInclude,
    });

    if (!mission) {
      console.log(`${LOG_PREFIX} skipping ${missionId} — not found`);
      return;
    }

    if (mission.deletedAt !== null) {
      await asyncTaskBus.publish({ type: "mission.scoring", payload: { missionId } });
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

    // 3. Load taxonomy from package.
    const taxonomies = getTaxonomies();

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
      const systemPrompt = promptVersion.buildSystemPrompt(buildTaxonomyBlock(toTaxonomyForPrompt(taxonomies)));
      const userMessage = promptVersion.buildUserMessage(buildMissionBlock(toMissionForPrompt(mission)));

      // 7. Call LLM with structured output (retry on AI_NoObjectGeneratedError)
      for (let attempt = 1; attempt <= LLM_NO_OBJECT_MAX_RETRIES; attempt++) {
        try {
          llmResult = await generateObject({
            model: promptVersion.MODEL,
            schema: promptVersion.ENRICHMENT_SCHEMA,
            system: systemPrompt,
            prompt: userMessage,
            maxRetries: LLM_MAX_RETRIES,
            temperature: promptVersion.TEMPERATURE,
          });
          break;
        } catch (error) {
          const isNoObject = (error as { name?: string })?.name === "AI_NoObjectGeneratedError";
          if (isNoObject && attempt < LLM_NO_OBJECT_MAX_RETRIES) {
            console.warn(`${LOG_PREFIX} ${missionId}: AI_NoObjectGeneratedError — retry ${attempt}/${LLM_NO_OBJECT_MAX_RETRIES}`);
            continue;
          }
          throw error;
        }
      }

      const { inputTokens, outputTokens, totalTokens } = llmResult.usage;
      console.log(`${LOG_PREFIX} ${missionId}: LLM response received — tokens: ${inputTokens} in / ${outputTokens} out / ${totalTokens} total`);

      // 8. Normalize + validate classifications against taxonomy rules
      const { valid, skipped } = validateEnrichmentClassifications(
        (llmResult.object as { classifications: ClassificationInput[] }).classifications,
        buildTaxonomyLookup(taxonomies),
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
        taxonomyKey: v.taxonomy_key,
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
    await asyncTaskBus.publish({ type: "mission.scoring", payload: { missionId } });
  },
};
