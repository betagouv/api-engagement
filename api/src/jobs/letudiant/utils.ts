import { PUBLISHER_IDS } from "@/config";
import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import {
  AUDIENCE_MAPPING,
  CONTRACT_MAPPING,
  DOMAIN_MAPPING,
  JOB_CATEGORY_MAPPING,
  ONLINE_DAYS_LIMIT,
  PUBLISHER_SYNC_CONFIGS,
  REMOTE_POLICY_MAPPING,
} from "@/jobs/letudiant/config";
import { missionService } from "@/services/mission";
import missionJobBoardService from "@/services/mission-jobboard";
import { PilotyClient } from "@/services/piloty/client";
import { PilotyJobCategory, PilotyMandatoryData } from "@/services/piloty/types";
import { publisherDiffusionExclusionService } from "@/services/publisher-diffusion-exclusion";
import { MissionRecord } from "@/types/mission";
import { JobBoardId, MissionJobBoardRecord } from "@/types/mission-job-board";
import he from "he";
import { setTimeout as sleep } from "timers/promises";

export { missionJobBoardService, missionService };
export const LETUDIANT_JOB_BOARD_ID: JobBoardId = "LETUDIANT";
export type MissionWithJobBoards = { mission: MissionRecord; jobBoards: MissionJobBoardRecord[] };

export type MissionEntryToArchive = {
  missionId: string;
  missionAddressId: string | null;
  publicId: string;
};

/**
 * Simple rate limiter: wait for a fixed delay (ms)
 * Default rate limit is 2 requests per second
 *
 * @param delayMs Delay in milliseconds
 */
export async function rateLimit(delayMs = 500) {
  await sleep(delayMs);
}

/**
 * Load the set of organizationClientIds excluded for L'Etudiant diffusion.
 * Returns a Set for O(1) lookups.
 */
export async function loadExcludedOrganizationClientIds(): Promise<Set<string>> {
  const exclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(PUBLISHER_IDS.LETUDIANT);
  return new Set(exclusions.map((e) => e.organizationClientId).filter((id): id is string => Boolean(id)));
}

/**
 * Phase: archive expired missions
 * Returns all currently ONLINE L'Etudiant entries that must be archived:
 * - mission deleted
 * - mission not ACCEPTED
 * - entry has been ONLINE for more than ONLINE_DAYS_LIMIT days
 * - mission's organization is in the exclusion list
 */
export async function getMissionEntriesToArchive(excludedOrgClientIds: Set<string>): Promise<MissionEntryToArchive[]> {
  const onlineCutoffDate = new Date(Date.now() - ONLINE_DAYS_LIMIT * 24 * 60 * 60 * 1000);
  const excludedClientIds = Array.from(excludedOrgClientIds);
  // Publishers with no quota are never archived by age (they are always fully synced)
  const unlimitedPublisherIds = PUBLISHER_SYNC_CONFIGS.filter((c) => c.quotaByDomain === null).map((c) => c.publisherId);

  const rows = await prisma.$queryRaw<Array<{ missionId: string; missionAddressId: string | null; publicId: string }>>(
    Prisma.sql`
      SELECT
        mjb.mission_id AS "missionId",
        mjb.mission_address_id AS "missionAddressId",
        mjb.public_id AS "publicId"
      FROM mission_jobboard mjb
      JOIN mission m ON m.id = mjb.mission_id
      WHERE mjb.jobboard_id = 'LETUDIANT'::"JobBoardId"
        AND mjb.sync_status = 'ONLINE'::"MissionJobBoardSyncStatus"
        AND (
          m.deleted_at IS NOT NULL
          OR m.status_code <> 'ACCEPTED'
          OR (
            mjb.created_at < ${onlineCutoffDate}
            ${unlimitedPublisherIds.length > 0 ? Prisma.sql`AND m.publisher_id NOT IN (${Prisma.join(unlimitedPublisherIds)})` : Prisma.sql``}
          )
          ${excludedClientIds.length > 0 ? Prisma.sql`OR m.organization_client_id IN (${Prisma.join(excludedClientIds)})` : Prisma.sql``}
        )
    `
  );

  return rows;
}

/**
 * Phase: update modified missions
 * Returns distinct mission IDs where the mission was updated after the last sync.
 */
export async function getMissionIdsToUpdate(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ missionId: string }>>(
    Prisma.sql`
      SELECT DISTINCT mjb.mission_id AS "missionId"
      FROM mission_jobboard mjb
      JOIN mission m ON m.id = mjb.mission_id
      JOIN publisher_organization po ON po.id = m.publisher_organization_id
      WHERE mjb.jobboard_id = 'LETUDIANT'::"JobBoardId"
        AND mjb.sync_status = 'ONLINE'::"MissionJobBoardSyncStatus"
        AND m.updated_at > mjb.updated_at
        AND po.organization_id_verified IS NOT NULL
    `
  );
  return rows.map((r) => r.missionId);
}

/**
 * Phase: publish new missions
 * Counts the number of ONLINE Piloty entries (not missions) per domain.
 * One mission with N addresses = N entries.
 * @param publisherIds Optional filter to count only entries from specific publishers (e.g. JVA only)
 */
export async function countOnlineEntriesByDomain(publisherIds?: string[]): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ domain: string; count: bigint }>>(
    Prisma.sql`
      SELECT d.name AS domain, COUNT(mjb.id)::bigint AS count
      FROM mission_jobboard mjb
      JOIN mission m ON m.id = mjb.mission_id
      JOIN domain d ON d.id = m.domain_id
      WHERE mjb.jobboard_id = 'LETUDIANT'::"JobBoardId"
        AND mjb.sync_status = 'ONLINE'::"MissionJobBoardSyncStatus"
        ${publisherIds && publisherIds.length > 0 ? Prisma.sql`AND m.publisher_id IN (${Prisma.join(publisherIds)})` : Prisma.sql``}
      GROUP BY d.name
    `
  );

  const result = new Map<string, number>();
  for (const row of rows) {
    result.set(row.domain, Number(row.count));
  }
  return result;
}

/**
 * Phase: publish new missions (quota-based publishers)
 * Returns mission IDs eligible for publication on a given domain, ordered newest first.
 * Excludes missions already ONLINE, missions with an ERROR status, and excluded orgs.
 */
export async function getMissionIdsToPublishByDomain(
  publisherIds: string[],
  domain: string,
  limit: number,
  excludedOrgClientIds: Set<string>,
  offset = 0
): Promise<string[]> {
  if (limit <= 0) {
    return [];
  }

  const excludedClientIds = Array.from(excludedOrgClientIds);

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT m.id
      FROM mission m
      JOIN domain d ON d.id = m.domain_id
      JOIN publisher_organization po ON po.id = m.publisher_organization_id
      WHERE m.publisher_id IN (${Prisma.join(publisherIds)})
        AND m.status_code = 'ACCEPTED'
        AND m.deleted_at IS NULL
        AND po.organization_id_verified IS NOT NULL
        AND d.name = ${domain}
        ${excludedClientIds.length > 0 ? Prisma.sql`AND (m.organization_client_id IS NULL OR m.organization_client_id NOT IN (${Prisma.join(excludedClientIds)}))` : Prisma.sql``}
        AND NOT EXISTS (
          SELECT 1 FROM mission_jobboard mjb_err
          WHERE mjb_err.mission_id = m.id
            AND mjb_err.jobboard_id = 'LETUDIANT'::"JobBoardId"
            AND mjb_err.sync_status = 'ERROR'::"MissionJobBoardSyncStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM mission_jobboard mjb_online
          WHERE mjb_online.mission_id = m.id
            AND mjb_online.jobboard_id = 'LETUDIANT'::"JobBoardId"
            AND mjb_online.sync_status = 'ONLINE'::"MissionJobBoardSyncStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM mission_jobboard mjb_offline
          WHERE mjb_offline.mission_id = m.id
            AND mjb_offline.jobboard_id = 'LETUDIANT'::"JobBoardId"
            AND mjb_offline.sync_status = 'OFFLINE'::"MissionJobBoardSyncStatus"
        )
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  );

  return rows.map((r) => r.id);
}

/**
 * Phase: publish new missions (unlimited publishers, e.g. ASC)
 * Returns all mission IDs eligible for publication, ordered newest first.
 * No domain filter, no limit — all eligible missions are returned.
 */
export async function getMissionIdsToPublishUnlimited(publisherIds: string[], excludedOrgClientIds: Set<string>): Promise<string[]> {
  const excludedClientIds = Array.from(excludedOrgClientIds);

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT m.id
      FROM mission m
      JOIN publisher_organization po ON po.id = m.publisher_organization_id
      WHERE m.publisher_id IN (${Prisma.join(publisherIds)})
        AND m.status_code = 'ACCEPTED'
        AND m.deleted_at IS NULL
        AND po.organization_id_verified IS NOT NULL
        ${excludedClientIds.length > 0 ? Prisma.sql`AND (m.organization_client_id IS NULL OR m.organization_client_id NOT IN (${Prisma.join(excludedClientIds)}))` : Prisma.sql``}
        AND NOT EXISTS (
          SELECT 1 FROM mission_jobboard mjb_err
          WHERE mjb_err.mission_id = m.id
            AND mjb_err.jobboard_id = 'LETUDIANT'::"JobBoardId"
            AND mjb_err.sync_status = 'ERROR'::"MissionJobBoardSyncStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM mission_jobboard mjb_online
          WHERE mjb_online.mission_id = m.id
            AND mjb_online.jobboard_id = 'LETUDIANT'::"JobBoardId"
            AND mjb_online.sync_status = 'ONLINE'::"MissionJobBoardSyncStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM mission_jobboard mjb_offline
          WHERE mjb_offline.mission_id = m.id
            AND mjb_offline.jobboard_id = 'LETUDIANT'::"JobBoardId"
            AND mjb_offline.sync_status = 'OFFLINE'::"MissionJobBoardSyncStatus"
        )
      ORDER BY m.created_at DESC
    `
  );

  return rows.map((r) => r.id);
}

/**
 * Load full missions with their existing job board entries for a list of mission IDs.
 */
export async function loadMissionsWithJobBoards(missionIds: string[]): Promise<MissionWithJobBoards[]> {
  if (!missionIds.length) {
    return [];
  }

  const missions = await missionService.findMissionsBy({ id: { in: missionIds } }, { limit: missionIds.length });
  const jobBoards = await missionJobBoardService.findByJobBoardAndMissionIds(
    LETUDIANT_JOB_BOARD_ID,
    missions.map((m) => m._id)
  );

  const jobBoardsByMission = new Map<string, MissionJobBoardRecord[]>();
  for (const entry of jobBoards) {
    const list = jobBoardsByMission.get(entry.missionId) ?? [];
    list.push(entry);
    jobBoardsByMission.set(entry.missionId, list);
  }

  const missionsById = new Map(missions.map((mission) => [mission._id, mission]));
  return missionIds
    .map((missionId) => missionsById.get(missionId))
    .filter((mission): mission is MissionRecord => Boolean(mission))
    .map((mission) => ({
      mission,
      jobBoards: jobBoardsByMission.get(mission._id) ?? [],
    }));
}

/**
 * Get mandatory data from Piloty:
 * - Contracts (benevolat, volontariat)
 * - Remote policies (full remote)
 * - Job category
 */
export async function getMandatoryData(client: PilotyClient): Promise<PilotyMandatoryData> {
  const contracts = await getMandatoryContracts(client);
  const remotePolicies = await getMandatoryRemotePolicies(client);
  const jobCategories = await getMandatoryJobCategories(client);

  return {
    contracts,
    remotePolicies,
    jobCategories,
  };
}

/**
 * Get mandatory contracts from Piloty, mapped by mission data
 * @param client The Piloty client
 * @returns {benevolat: string, volontariat: string}
 */
export async function getMandatoryContracts(client: PilotyClient): Promise<PilotyMandatoryData["contracts"]> {
  const contracts = await client.getContracts();
  if (!contracts) {
    throw new Error("Unable to fetch contracts from Piloty");
  }
  const benevolat = contracts.find((c) => c.ref === CONTRACT_MAPPING.benevolat);
  const volontariat = contracts.find((c) => c.ref === CONTRACT_MAPPING.volontariat);
  if (!benevolat || !volontariat) {
    throw new Error("Unable to find volunteering or civil service contract");
  }
  return {
    benevolat: benevolat.id,
    volontariat: volontariat.id,
  };
}

/**
 * Get mandatory remote policies from Piloty, mapped by mission data
 * @param client The Piloty client
 * @returns {full: string}
 */
export async function getMandatoryRemotePolicies(client: PilotyClient): Promise<PilotyMandatoryData["remotePolicies"]> {
  const remotePolicies = await client.getRemotePolicies();
  if (!remotePolicies) {
    throw new Error("Unable to fetch remote policies from Piloty");
  }
  const fullRemote = remotePolicies.find((p) => p.ref === REMOTE_POLICY_MAPPING.fullRemote);
  if (!fullRemote) {
    throw new Error("Unable to find 'full remote' policy");
  }
  return {
    full: fullRemote.id,
  };
}

/**
 * Get mandatory job categories from Piloty, mapped by mission domain.
 * Each key is a mission "domain" field value.
 *
 * @param client The Piloty client
 * @returns {key: value}
 */
export async function getMandatoryJobCategories(client: PilotyClient): Promise<PilotyMandatoryData["jobCategories"]> {
  // Recursive sub function to find category ID by ref (job category is a tree)
  function findCategoryIdByRef(categories: PilotyJobCategory[], ref: string): string | undefined {
    for (const cat of categories) {
      if (cat.ref === ref) {
        return cat.id;
      }
      if (cat.children?.data?.length) {
        const found = findCategoryIdByRef(cat.children.data, ref);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  const jobCategories = await client.getJobCategories();
  if (!jobCategories) {
    throw new Error("Unable to fetch job categories from Piloty");
  }
  const jobCategoryIds: Record<string, string> = {};
  for (const ref of Object.keys(JOB_CATEGORY_MAPPING) as Array<keyof typeof JOB_CATEGORY_MAPPING>) {
    const id = findCategoryIdByRef(jobCategories, JOB_CATEGORY_MAPPING[ref]);
    if (!id) {
      throw new Error(`Unable to find job category for ref: ${ref}`);
    }
    jobCategoryIds[ref] = id;
  }
  return jobCategoryIds;
}

/**
 * Decode HTML entities from a string if it contains them.
 * @param text The text to decode
 * @returns The decoded text
 */
export function decodeHtml(text: string | null | undefined): string {
  if (text && text.includes("&")) {
    return he.decode(text);
  }
  return text || "";
}

/**
 * Get domain Label from config
 * @param domain
 * @returns label
 */
export function getDomainLabel(domain: string): string {
  return DOMAIN_MAPPING[domain] || DOMAIN_MAPPING["autre"];
}

/**
 * Get audience label from config
 * @param audience
 * @returns label
 */
export function getAudienceLabel(audience: string): string {
  return AUDIENCE_MAPPING[audience] || AUDIENCE_MAPPING["any_public"];
}
