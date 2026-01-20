import { MissionRecord } from "../../types/mission";
import { getMissionTrackedApplicationUrl } from "../../utils";
import { TALENT_PUBLISHER_ID } from "./config";
import { TalentJob } from "./types";
import { getActivityCategory, getImageUrl } from "./utils";

/**
 * Format mission to Talent Job
 * Doc: https://www.talent.com/integrations
 *
 * @param mission - Mission to format
 * @param defaultCompany - Default company to use if organizationName is not in LINKEDIN_COMPANY_ID
 * @returns LinkedInJob | null
 */
export function missionToTalentJob(mission: MissionRecord): TalentJob[] {
  const company = mission.publisherName ?? mission.organizationName ?? "";
  const dateposted = mission.postedAt ? new Date(mission.postedAt).toISOString() : new Date(mission.createdAt).toISOString();
  const missionJob = {
    referencenumber: String(mission._id),
    title: `Bénévolat - ${mission.title}`,
    company,
    dateposted,
    url: getMissionTrackedApplicationUrl(mission, TALENT_PUBLISHER_ID),
    description: mission.descriptionHtml,
    jobtype: "part-time",
    expirationdate: mission.endAt ? new Date(mission.endAt).toISOString() : undefined,
    isremote: mission.remote === "no" ? "no" : "yes",
    category: mission.activity ? getActivityCategory(mission.activity) : undefined,
    logo: getImageUrl(mission.organizationLogo || ""),
  } as TalentJob;

  if (!mission.addresses || mission.addresses.length === 0) {
    return [{ ...missionJob, city: "Paris", state: "Île-de-France", country: "FR" }];
  }

  const jobs = [] as TalentJob[];

  for (const address of mission.addresses) {
    jobs.push({
      ...missionJob,
      city: address.city,
      state: address.region,
      country: address.country || "FR",
      streetaddress: address.street,
      postalcode: address.postalCode,
    } as TalentJob);
  }

  return jobs;
}
