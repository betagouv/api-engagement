import { Import as PrismaImport } from "@/db/core";
import type { ImportedMission, ImportedOrganization } from "@/jobs/import-missions/types";
import { missionService } from "@/services/mission";
import { changesRequireEnrichment, orgChangesRequireEnrichment } from "@/services/mission-enrichment/triggers";
import publisherOrganizationService from "@/services/publisher-organization";
import type { MissionRecord } from "@/types/mission";
import { MissionUpdatePatch } from "@/types/mission";
import type { PublisherRecord } from "@/types/publisher";
import { PublisherOrganizationRecord } from "@/types/publisher-organization";
import { getJobTime } from "@/utils/job";
import { getMissionChanges } from "@/utils/mission";
import { getPublisherOrganizationChanges } from "@/utils/publisher-organization";

type UpsertOrganizationResult = {
  action: "created" | "updated" | "unchanged";
  organization: PublisherOrganizationRecord;
  /** True si un champ d'org consommé par le prompt a changé → missions liées à ré-enrichir. */
  enrichmentRelevant: boolean;
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
      // Mission nouvelle ou existante : l'enrichissement est piloté côté mission (create/update).
      enrichmentRelevant: false,
    };
  }

  const changes = getPublisherOrganizationChanges(existing, input as PublisherOrganizationRecord);
  if (!changes) {
    return {
      action: "unchanged",
      organization: existing,
      enrichmentRelevant: false,
    };
  }

  const updated = await publisherOrganizationService.update(existing.id, input);
  return {
    action: "updated",
    organization: updated,
    enrichmentRelevant: orgChangesRequireEnrichment(changes),
  };
};

// ============================================================================
// Mission upsert
// ============================================================================

type UpsertMissionResult = {
  action: "created" | "updated" | "unchanged";
  mission: MissionRecord;
};

/**
 * Upsert a single mission
 *
 * @param input - The mission data to upsert
 * @param existing - The existing mission from DB (or null if not found)
 * @param options.organizationChanged - True si l'organisation liée a vu un champ consommé par
 *   le prompt changer dans le même import : force le ré-enrichissement même si la mission
 *   elle-même n'a pas (ou seulement du bruit) changé, pour ne pas figer des classifications
 *   sur des données d'organisation obsolètes.
 * @returns The result of the upsert operation
 */
export const upsertMission = async (input: ImportedMission, existing: MissionRecord | null, options: { organizationChanged?: boolean } = {}): Promise<UpsertMissionResult> => {
  const { organizationChanged = false } = options;

  // Create new mission
  if (!existing) {
    const created = await missionService.create(input);
    return {
      action: "created",
      mission: created,
    };
  }

  // Check if update is needed
  const changes = getMissionChanges(existing, input);
  if (!changes) {
    // Mission inchangée : ne ré-enrichir que si l'organisation liée a changé (données du prompt).
    if (organizationChanged) {
      await missionService.handleEnrichmentContextChanged(existing.id);
    }
    return {
      action: "unchanged",
      mission: existing,
    };
  }

  const updated = await missionService.update(existing.id, input as MissionUpdatePatch);
  if (organizationChanged && !changesRequireEnrichment(changes)) {
    await missionService.handleEnrichmentContextChanged(existing.id);
  }
  return {
    action: "updated",
    mission: updated,
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
export const cleanDB = async (missionsClientIds: string[], publisher: PublisherRecord, importDoc: PrismaImport) => {
  console.log(`[${publisher.name}] Cleaning missions...`);

  const missions = await missionService.findMissionsBy({
    publisherId: publisher.id,
    deletedAt: null,
    ...(missionsClientIds.length ? { clientId: { notIn: missionsClientIds } } : {}),
  });

  const cleanStartedAt = new Date();
  for (const mission of missions) {
    await missionService.update(mission.id, { deletedAt: importDoc.startedAt } as MissionUpdatePatch);
  }
  console.log(`[${publisher.name}] Mission clean updates done: ${missions.length} in ${getJobTime(cleanStartedAt)}`);

  importDoc.deletedCount = missions.length;
  console.log(`[${publisher.name}] Mission cleaning removed ${missions.length}`);
};
