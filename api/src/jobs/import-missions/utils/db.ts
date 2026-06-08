import { Import as PrismaImport } from "@/db/core";
import type { ImportedMission, ImportedOrganization } from "@/jobs/import-missions/types";
import { missionService } from "@/services/mission";
import { ENRICHMENT_TRIGGER_FIELDS } from "@/services/mission-enrichment/prompts";
import { missionEventService } from "@/services/mission-event";
import publisherOrganizationService from "@/services/publisher-organization";
import type { MissionRecord } from "@/types/mission";
import { MissionUpdatePatch } from "@/types/mission";
import { MissionEventCreateParams } from "@/types/mission-event";
import type { PublisherRecord } from "@/types/publisher";
import { PublisherOrganizationRecord } from "@/types/publisher-organization";
import { getJobTime } from "@/utils/job";
import { EVENT_TYPES, getMissionChanges } from "@/utils/mission";
import { getPublisherOrganizationChanges } from "@/utils/publisher-organization";

const ENRICHMENT_TRIGGER_FIELD_SET = new Set<string>(ENRICHMENT_TRIGGER_FIELDS);

/**
 * Détermine si un diff de mission justifie un ré-enrichissement.
 *
 * La grande majorité des updates d'import ne portent que sur des champs hors-prompt
 * (compteurs `places`/`snuPlaces`, `addresses`, dates glissantes `startAt`/`endAt`/`postedAt`,
 * `duration` dérivée…) : ré-enrichir dans ces cas est inutile et coûteux (tokens LLM).
 * On ne ré-enrichit que si un champ réellement consommé par le prompt a changé
 * (cf. `ENRICHMENT_TRIGGER_FIELDS`). Le changement de `deletedAt` (restauration d'une mission)
 * force aussi le retraitement.
 */
export const changesRequireEnrichment = (changes: Record<string, unknown>): boolean =>
  Object.keys(changes).some((field) => field === "deletedAt" || ENRICHMENT_TRIGGER_FIELD_SET.has(field));

type UpsertOrganizationResult = {
  action: "created" | "updated" | "unchanged";
  organization: PublisherOrganizationRecord;
};
/**
 * Upsert a single organization
 *
 * @param input - The organization data to upsert
 * @param existing - The existing organization from DB (or null if not found)
 * @param publisherId - The publisher ID
 * @returns true if the organization was created or updated, false if no change was needed
 */
export const upsertOrganization = async (input: ImportedOrganization, existing: PublisherOrganizationRecord | null): Promise<UpsertOrganizationResult> => {
  if (!existing) {
    const created = await publisherOrganizationService.create(input);
    return {
      action: "created",
      organization: created,
    };
  }

  const changes = getPublisherOrganizationChanges(existing, input as PublisherOrganizationRecord);
  if (!changes) {
    return {
      action: "unchanged",
      organization: existing,
    };
  }

  const updated = await publisherOrganizationService.update(existing.id, input);
  return {
    action: "updated",
    organization: updated,
  };
};

// ============================================================================
// Mission upsert
// ============================================================================

type UpsertMissionResult = {
  action: "created" | "updated" | "unchanged";
  mission: MissionRecord;
  event: MissionEventCreateParams | null;
};

/**
 * Upsert a single mission
 *
 * @param input - The mission data to upsert
 * @param existing - The existing mission from DB (or null if not found)
 * @returns The result of the upsert operation
 */
export const upsertMission = async (input: ImportedMission, existing: MissionRecord | null): Promise<UpsertMissionResult> => {
  // Create new mission
  if (!existing) {
    const created = await missionService.create(input);
    return {
      action: "created",
      mission: created,
      event: {
        missionId: created.id,
        type: EVENT_TYPES.CREATE,
        changes: null,
      },
    };
  }

  // Check if update is needed
  const changes = getMissionChanges(existing, input);
  if (!changes) {
    return {
      action: "unchanged",
      mission: existing,
      event: null,
    };
  }

  // Update existing mission — only re-enrich when a prompt-relevant field actually changed
  const updated = await missionService.update(existing.id, input as MissionUpdatePatch, {
    enqueueEnrichment: changesRequireEnrichment(changes),
  });
  return {
    action: "updated",
    mission: updated,
    event: {
      missionId: existing.id,
      type: changes.deletedAt?.current === null ? EVENT_TYPES.DELETE : EVENT_TYPES.UPDATE,
      changes,
    },
  };
};

/**
 * Clean missions in DB
 * All missions related to given publisher and not in the bulk are deleted
 *
 * @param missionsClientIds - Array of mission clientIds
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 */
export const cleanDB = async (missionsClientIds: string[], publisher: PublisherRecord, importDoc: PrismaImport, options: { recordMissionEvents: boolean }) => {
  console.log(`[${publisher.name}] Cleaning missions...`);

  const missions = await missionService.findMissionsBy({
    publisherId: publisher.id,
    deletedAt: null,
    ...(missionsClientIds.length ? { clientId: { notIn: missionsClientIds } } : {}),
  });

  const events: MissionEventCreateParams[] = [];
  for (const mission of missions) {
    events.push({
      missionId: mission.id,
      type: EVENT_TYPES.DELETE,
      changes: { deletedAt: true },
    });
  }

  const cleanStartedAt = new Date();
  for (const mission of missions) {
    await missionService.update(mission.id, { deletedAt: importDoc.startedAt } as MissionUpdatePatch);
  }
  console.log(`[${publisher.name}] Mission clean updates done: ${missions.length} in ${getJobTime(cleanStartedAt)}`);

  if (options.recordMissionEvents && events.length > 0) {
    const eventsStartedAt = new Date();
    await missionEventService.createMissionEvents(events);
    console.log(`[${publisher.name}] Mission clean events created: ${events.length} in ${getJobTime(eventsStartedAt)}`);
  }

  importDoc.deletedCount = missions.length;
  console.log(`[${publisher.name}] Mission cleaning removed ${missions.length}`);
};
