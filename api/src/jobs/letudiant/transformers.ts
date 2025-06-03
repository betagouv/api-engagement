import { SC_ID } from "../../config";
import { PilotyCompanyPayload, PilotyJobPayload, PilotyMandatoryData } from "../../services/piloty/types";
import { Mission } from "../../types";
import { MEDIA_PUBLIC_ID } from "./config";

export function missionToPilotyJob(mission: Mission, companyId: string, mandatoryData: PilotyMandatoryData): PilotyJobPayload {
  return {
    media_public_id: MEDIA_PUBLIC_ID,
    company_public_id: companyId,
    name: mission.title,
    contract_id: mission.publisherId === SC_ID ? mandatoryData.contracts.volontariat : mandatoryData.contracts.benevolat,
    job_category_id: mandatoryData.jobCategories[mission.domain || "autre"],
    localisation: mission.remote === "full" ? "A distance" : mission.city || "",
    description_job: mission.description,
    application_method: "external_apply",
    application_url: mission.applicationUrl,
    state: mission.deletedAt ? "archived" : "published",
    worktime_id: "", // TODO
    remote_policy_id: mission.remote === "full" ? mandatoryData.remotePolicies.full : undefined,
    education_id: "", // TODO
    experience_id: "", // TODO
    salary: "", // TODO
    position_level: "employee", // TODO
    description_company: "", // TODO
    description_profile: "", // TODO
    description_benefits: "", // TODO
    description_process: "", // TODO
  };
}

export function missionToPilotyCompany(mission: Mission): PilotyCompanyPayload {
  return {
    media_public_id: MEDIA_PUBLIC_ID,
    name: mission.organizationName || mission.associationName || "",
    domain_url: "",
    sector_id: "", // TODO
    size_id: "", // TODO
    description: "", // TODO
    logo_url: mission.organizationLogo,
  };
}
