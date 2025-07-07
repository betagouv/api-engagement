// Utility functions for letudiant job sync
import he from "he";
import { HydratedDocument } from "mongoose";
import { setTimeout as sleep } from "timers/promises";
import MissionModel from "../../models/mission";
import { PilotyClient } from "../../services/piloty/client";
import { PilotyJobCategory, PilotyMandatoryData } from "../../services/piloty/types";
import { Mission } from "../../types";
import { CONTRACT_MAPPING, JOB_CATEGORY_MAPPING, PUBLISHERS_IDS, REMOTE_POLICY_MAPPING } from "./config";

/**
 * Check if a mission is already synced to Piloty
 */
export function isAlreadySynced(mission: Mission): boolean {
  return Boolean(mission.letudiantPublicId && mission.letudiantUpdatedAt && mission.letudiantUpdatedAt.getTime() >= mission.updatedAt.getTime());
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
export async function getMissionsToSync(id?: string, limit = 10): Promise<HydratedDocument<Mission>[]> {
  if (id) {
    return MissionModel.find({ _id: id }).limit(1);
  }

  const missions = await MissionModel.find({
    deletedAt: null,
    statusCode: "ACCEPTED",
    publisherId: {
      $in: PUBLISHERS_IDS,
    },
    organizationId: {
      $exists: true,
      $ne: null,
      // Ensure the string is a 24-character hex string (Mongo ObjectId)
      $regex: /^[0-9a-fA-F]{24}$/,
    },
    letudiantPublicId: {
      $exists: false,
    },
    letudiantError: {
      $exists: false,
    },
    $or: [{ letudiantPublicId: { $exists: true } }, { $expr: { $lt: ["$letudiantUpdatedAt", "$updatedAt"] } }],
  }).limit(limit);

  return missions;
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
export function decodeHtml(text: string): string {
  if (text && text.includes("&")) {
    return he.decode(text);
  }
  return text;
}
