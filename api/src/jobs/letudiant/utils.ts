// Utility functions for letudiant job sync
import { setTimeout as sleep } from "timers/promises";
import MissionModel from "../../models/mission";
import { PilotyClient } from "../../services/piloty/client";
import { PilotyJobCategory, PilotyMandatoryData } from "../../services/piloty/types";
import { Mission } from "../../types";
import { HydratedDocument } from "mongoose";

/**
 * Check if a mission is already synced to Piloty (idempotence)
 */
export function isAlreadySynced(mission: Mission): boolean {
  return Boolean(mission.letudiantPublicId);
}

/**
 * Simple rate limiter: wait for a fixed delay (ms)
 */
export async function rateLimit(delayMs = 1000) {
  await sleep(delayMs);
}

/**
 * Get missions created or updated since the last sync
 * TODO: get last sync date from DB
 */
export async function getMissionsToSync(id?: string): Promise<HydratedDocument<Mission>[]> {
  const query: any = {
    deletedAt: null,
    statusCode: "ACCEPTED",
  };

  if (id) {
    query._id = id;
  }
  return MissionModel.find(query).sort({ createdAt: "asc" });
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

export async function getMandatoryContracts(client: PilotyClient): Promise<PilotyMandatoryData["contracts"]> {
  const CONTRACT_REF = {
    benevolat: "volunteering",
    volontariat: "civil_service",
  };
  const contracts = await client.getContracts();
  if (!contracts) {
    throw new Error("Unable to fetch contracts from Piloty");
  }
  const benevolat = contracts.find((c) => c.ref === CONTRACT_REF.benevolat);
  const volontariat = contracts.find((c) => c.ref === CONTRACT_REF.volontariat);
  if (!benevolat || !volontariat) {
    throw new Error("Unable to find volunteering or civil service contract");
  }
  return {
    benevolat: benevolat.id,
    volontariat: volontariat.id,
  };
}

export async function getMandatoryRemotePolicies(client: PilotyClient): Promise<PilotyMandatoryData["remotePolicies"]> {
  const REMOTE_POLICY_REF = {
    fullRemote: "fulltime",
  };
  const remotePolicies = await client.getRemotePolicies();
  if (!remotePolicies) {
    throw new Error("Unable to fetch remote policies from Piloty");
  }
  const fullRemote = remotePolicies.find((p) => p.ref === REMOTE_POLICY_REF.fullRemote);
  if (!fullRemote) {
    throw new Error("Unable to find 'full remote' policy");
  }
  return {
    full: fullRemote.id,
  };
}

export async function getMandatoryJobCategories(client: PilotyClient): Promise<PilotyMandatoryData["jobCategories"]> {
  // Key is mission "domain" field
  const JOB_CATEGORY_REF = {
    environnement: "environment_energie",
    "solidarite-insertion": "arts_culture_sport_professional_dancer", // TODO
    sante: "health_social",
    "culture-loisirs": "tourism_leisure",
    education: "education_training",
    emploi: "hr",
    sport: "arts_culture_sport",
    humanitaire: "arts_culture_sport_professional_dancer", // TODO
    animaux: "health_social_pet_sitting",
    "vivre-ensemble": "health_social",
    autre: "arts_culture_sport_professional_dancer", // TODO: find better fallback
  };

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
  for (const ref of Object.keys(JOB_CATEGORY_REF) as Array<keyof typeof JOB_CATEGORY_REF>) {
    const id = findCategoryIdByRef(jobCategories, JOB_CATEGORY_REF[ref]);
    if (!id) {
      throw new Error(`Unable to find job category for ref: ${ref}`);
    }
    jobCategoryIds[ref] = id;
  }
  return jobCategoryIds;
}
