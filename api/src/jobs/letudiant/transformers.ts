import { PUBLISHER_IDS } from "../../config";
import { PilotyCompanyPayload, PilotyJobPayload, PilotyMandatoryData } from "../../services/piloty/types";
import { MissionType } from "../../types";
import { MissionRecord } from "../../types/mission";
import { getMissionTrackedApplicationUrl } from "../../utils/mission";
import { MEDIA_PUBLIC_ID } from "./config";
import { decodeHtml } from "./utils";

type LetudiantMission = MissionRecord & { associationName?: string | null };

export type PilotyJobWithAddress = {
  payload: PilotyJobPayload;
  missionAddressId: string | null;
};

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
 * @returns The job payloads with their associated mission address
 */
export function missionToPilotyJobs(mission: MissionRecord, companyId: string, mandatoryData: PilotyMandatoryData): PilotyJobWithAddress[] {
  function buildJobPayload(isRemote: boolean, localisation: string | undefined): PilotyJobPayload {
    return {
      media_public_id: MEDIA_PUBLIC_ID,
      company_public_id: companyId,
      name: mission.type === MissionType.VOLONTARIAT ? `Volontariat - ${mission.title}` : mission.title,
      contract_id: mission.type === MissionType.VOLONTARIAT ? mandatoryData.contracts.volontariat : mandatoryData.contracts.benevolat,
      job_category_id: mandatoryData.jobCategories[mission.domain ?? "autre"] ?? mandatoryData.jobCategories["autre"],
      localisation: localisation || "France",
      description_job: decodeHtml(mission.descriptionHtml),
      application_method: "external_apply",
      application_url: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.LETUDIANT),
      state: mission.deletedAt || mission.statusCode !== "ACCEPTED" ? "archived" : "published",
      remote_policy_id: isRemote ? mandatoryData.remotePolicies.full : undefined,
      position_level: "employee",
      description_company: mission.organizationDescription || "",
    };
  }

  // Helper to format localisation as "city, department, country" without empty parts
  function formatLocalisation(parts: Array<string | undefined | null>): string {
    return parts.filter((p) => Boolean(p && String(p).trim().length)).join(", ");
  }

  if (mission.remote === "full" || !mission.addresses.length) {
    const city = mission.organizationCity || undefined;
    const department = mission.organizationDepartment || undefined;
    const country = mission.country || "France";
    const formatted = formatLocalisation([city, department, country]) || "France";
    return [
      {
        payload: buildJobPayload(true, formatted),
        missionAddressId: null,
      },
    ];
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

  return uniqueAddresses.map((address) => {
    const localisation = formatLocalisation([address.city, address.departmentName, address.country || "France"]);
    return {
      payload: buildJobPayload(false, localisation),
      missionAddressId: address.id ?? null,
    };
  });
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
export async function missionToPilotyCompany(mission: LetudiantMission): Promise<PilotyCompanyPayload> {
  return {
    media_public_id: MEDIA_PUBLIC_ID,
    name: mission.organizationName || mission.associationName || "",
    // domain_url: (await getValidAndAccessibleUrl(mission.organizationUrl)) || "", // TODO: since Piloty seems to reject most of the urls, we skip it for now
    description: mission.organizationDescription || "",
    logo_url: mission.organizationLogo || "",
  };
}
