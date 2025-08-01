import { PUBLISHER_IDS } from "../../config";
import { PilotyCompanyPayload, PilotyJobPayload, PilotyMandatoryData } from "../../services/piloty/types";
import { Mission, MissionType } from "../../types";
import { getMissionTrackedApplicationUrl } from "../../utils/mission";
import { MEDIA_PUBLIC_ID } from "./config";
import { decodeHtml } from "./utils";

/**
 * Transform a mission into a Piloty job payload
 * A job will be created for each address of the mission
 * NB: these fields are not handled for now (seems not needed):
 * - worktime_id
 * - education_id
 * - experience_id
 * - salary
 * - position_level
 * - description_profile
 * - description_benefits
 * - description_process
 * - manager_emails
 * - recruiter_emails
 *
 * @param mission The mission to transform
 * @param companyId The company public id
 * @param mandatoryData The mandatory data from Piloty
 * @returns The job payloads
 */
export function missionToPilotyJobs(mission: Mission, companyId: string, mandatoryData: PilotyMandatoryData): PilotyJobPayload[] {
  // Build payload depending on localisation. If no localisation, it's a remote job
  function buildJobPayload(localisation: string | undefined): PilotyJobPayload {
    return {
      media_public_id: MEDIA_PUBLIC_ID,
      company_public_id: companyId,
      name: mission.title,
      contract_id: mission.type === MissionType.VOLONTARIAT ? mandatoryData.contracts.volontariat : mandatoryData.contracts.benevolat,
      job_category_id: mandatoryData.jobCategories[mission.domain] ?? mandatoryData.jobCategories["autre"],
      localisation: localisation || "A distance",
      description_job: decodeHtml(mission.descriptionHtml),
      application_method: "external_apply",
      application_url: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.LETUDIANT),
      state: mission.deletedAt || mission.statusCode !== "ACCEPTED" ? "archived" : "published",
      remote_policy_id: localisation ? undefined : mandatoryData.remotePolicies.full,
      position_level: "employee",
      description_company: mission.organizationDescription || "",
    };
  }

  if (mission.remote === "full" || !mission.addresses.length) {
    return [buildJobPayload(undefined)];
  }

  // Group addresses by city
  const seenCities = new Set<string>();
  const uniqueAddresses = mission.addresses.filter((address) => {
    const city = address.city || "";
    if (seenCities.has(city)) {
      return false;
    }
    seenCities.add(city);
    return true;
  });

  return uniqueAddresses.map((address) => buildJobPayload(address.city));
}

/**
 * Transform a mission into a Piloty company payload
 * NB: these fields are not handled for now (seems not needed):
 * - sector_id
 * - size_id
 *
 * @param mission The mission to transform
 * @returns The company payload
 */
export async function missionToPilotyCompany(mission: Mission): Promise<PilotyCompanyPayload> {
  return {
    media_public_id: MEDIA_PUBLIC_ID,
    name: mission.organizationName || mission.associationName || "",
    // domain_url: (await getValidAndAccessibleUrl(mission.organizationUrl)) || "", // TODO: since Piloty seems to reject most of the urls, we skip it for now
    description: mission.organizationDescription || "",
    logo_url: mission.organizationLogo,
  };
}
