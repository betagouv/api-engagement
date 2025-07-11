import { PUBLISHER_IDS } from "../../config";
import { PilotyCompanyPayload, PilotyJobPayload, PilotyMandatoryData } from "../../services/piloty/types";
import { Mission, MissionType } from "../../types";
import { getMissionTrackedApplicationUrl } from "../../utils/mission";
import { MEDIA_PUBLIC_ID } from "./config";
import { decodeHtml } from "./utils";

/**
 * Transform a mission into a Piloty job payload
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
 * @returns The job payload
 */
export function missionToPilotyJob(mission: Mission, companyId: string, mandatoryData: PilotyMandatoryData): PilotyJobPayload {
  return {
    media_public_id: MEDIA_PUBLIC_ID,
    company_public_id: companyId,
    name: mission.title,
    contract_id: mission.type === MissionType.VOLONTARIAT ? mandatoryData.contracts.volontariat : mandatoryData.contracts.benevolat,
    job_category_id: mandatoryData.jobCategories[mission.domain] ?? mandatoryData.jobCategories["autre"],
    localisation: mission.remote === "full" ? "A distance" : mission.city || "",
    description_job: decodeHtml(mission.descriptionHtml),
    application_method: "external_apply",
    application_url: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.LETUDIANT),
    state: mission.deletedAt ? "archived" : "published",
    remote_policy_id: mission.remote === "full" ? mandatoryData.remotePolicies.full : undefined,
    position_level: "employee",
    description_company: mission.organizationDescription || "",
  };
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
