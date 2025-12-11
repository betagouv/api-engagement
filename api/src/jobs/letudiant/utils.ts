// Utility functions for letudiant job sync
import he from "he";
import { setTimeout as sleep } from "timers/promises";
import { missionService } from "../../services/mission";
import missionJobBoardService from "../../services/mission-jobboard";
import { PilotyClient } from "../../services/piloty/client";
import { PilotyJobCategory, PilotyMandatoryData } from "../../services/piloty/types";
import { MissionRecord } from "../../types/mission";
import { JobBoardId, MissionJobBoardRecord } from "../../types/mission-job-board";
import { CONTRACT_MAPPING, DAYS_AFTER_REPUBLISH, JOB_CATEGORY_MAPPING, REMOTE_POLICY_MAPPING, WHITELISTED_PUBLISHERS_IDS } from "./config";

export const LETUDIANT_JOB_BOARD_ID: JobBoardId = "LETUDIANT";
export type MissionWithJobBoards = { mission: MissionRecord; jobBoards: MissionJobBoardRecord[] };

const ORGANIZATION_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const hasJobBoardEntry = (jobBoards: MissionJobBoardRecord[]) => jobBoards.length > 0;

const shouldSyncMission = (mission: MissionRecord, jobBoards: MissionJobBoardRecord[], republishingDate: Date): boolean => {
  if (!mission.organizationId || !ORGANIZATION_ID_REGEX.test(mission.organizationId)) {
    return false;
  }
  if (mission.letudiantError !== null && mission.letudiantError !== undefined) {
    return false;
  }

  const letudiantUpdatedAt = mission.letudiantUpdatedAt ?? null;
  const alreadySent = hasJobBoardEntry(jobBoards);

  const needsAcceptedSync =
    mission.deletedAt === null && mission.statusCode === "ACCEPTED" && (!letudiantUpdatedAt || letudiantUpdatedAt < mission.updatedAt || letudiantUpdatedAt < republishingDate);

  const needsDeletedSync = mission.deletedAt !== null && alreadySent && !!letudiantUpdatedAt && mission.deletedAt < letudiantUpdatedAt;

  const needsStatusSync = mission.statusCode !== "ACCEPTED" && alreadySent && !!letudiantUpdatedAt && mission.updatedAt < letudiantUpdatedAt;

  return needsAcceptedSync || needsDeletedSync || needsStatusSync;
};

/**
 * Check if a mission is already synced to Piloty
 */
export function isAlreadySynced(mission: MissionRecord, jobBoards: MissionJobBoardRecord[]): boolean {
  return Boolean(jobBoards.length && mission.letudiantUpdatedAt && mission.letudiantUpdatedAt.getTime() >= mission.updatedAt.getTime());
}

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
 * Get accepted missions from whitelisted publishers created or updated since the last sync
 *
 * @param id Optional mission ID to sync
 * @param limit Optional limit (default: 10)
 */
export async function getMissionsToSync(id?: string, limit = 10): Promise<MissionWithJobBoards[]> {
  if (id) {
    const mission = await missionService.findOneMission(id);
    if (!mission) {
      return [];
    }
    const jobBoards = await missionJobBoardService.findByJobBoardAndMissionIds(LETUDIANT_JOB_BOARD_ID, [mission._id]);
    return [{ mission, jobBoards }];
  }

  const republishingDate = new Date(Date.now() - DAYS_AFTER_REPUBLISH * 24 * 60 * 60 * 1000);

  const where = {
    publisherId: { in: WHITELISTED_PUBLISHERS_IDS },
    organizationId: { not: null },
    letudiantError: null,
  };

  const filtered: Array<{ mission: MissionRecord; jobBoards: MissionJobBoardRecord[] }> = [];
  const pageSize = Math.max(limit * 3, limit, 1);
  let page = 0;

  while (filtered.length < limit) {
    const missions = await missionService.findMissionsBy(where, {
      limit: pageSize,
      skip: page * pageSize,
      orderBy: { updatedAt: "desc" },
    });

    if (!missions.length) {
      break;
    }

    const jobBoards = await missionJobBoardService.findByJobBoardAndMissionIds(
      LETUDIANT_JOB_BOARD_ID,
      missions.map((mission) => mission._id)
    );
    const jobBoardsByMission = new Map<string, MissionJobBoardRecord[]>();
    for (const entry of jobBoards) {
      const list = jobBoardsByMission.get(entry.missionId) ?? [];
      list.push(entry);
      jobBoardsByMission.set(entry.missionId, list);
    }

    for (const mission of missions) {
      const entries = jobBoardsByMission.get(mission._id) ?? [];
      if (shouldSyncMission(mission, entries, republishingDate)) {
        filtered.push({ mission, jobBoards: entries });
        if (filtered.length >= limit) {
          break;
        }
      }
    }

    if (filtered.length >= limit) {
      break;
    }

    if (missions.length < pageSize) {
      break;
    }

    page++;
  }

  return filtered;
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
