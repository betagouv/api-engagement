import { Mission } from "../../types";
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
export function missionToTalentJob(mission: Mission): TalentJob[] {
  if (!mission.addresses || mission.addresses.length === 0) {
    return [
      {
        referencenumber: String(mission._id),
        title: `Bénévolat - ${mission.title}`,
        company: mission.publisherName,
        city: "Paris",
        state: "Île-de-France",
        country: "France",
        dateposted: new Date(mission.postedAt).toISOString(),
        url: getMissionTrackedApplicationUrl(mission, TALENT_PUBLISHER_ID),
        description: mission.descriptionHtml,
        jobtype: "part-time",
        expirationdate: mission.endAt ? new Date(mission.endAt).toISOString() : undefined,
        isremote: mission.remote === "no" ? "no" : "yes",
        category: getActivityCategory(mission.activity),
        logo: mission.organizationLogo,
      },
    ] as TalentJob[];
  }

  const jobs = [] as TalentJob[];

  for (const address of mission.addresses) {
    const job = {
      referencenumber: String(mission._id),
      title: `Bénévolat - ${mission.title}`,
      company: mission.publisherName,
      city: address.city,
      state: address.region,
      country: address.country || "FR",
      dateposted: new Date(mission.postedAt).toISOString(),
      url: getMissionTrackedApplicationUrl(mission, TALENT_PUBLISHER_ID),
      description: mission.descriptionHtml,
      jobtype: "part-time",
      expirationdate: mission.endAt ? new Date(mission.endAt).toISOString() : undefined,
      streetaddress: address.street,
      postalcode: address.postalCode,
      isremote: mission.remote === "no" ? "no" : "yes",
      category: getActivityCategory(mission.activity),
      logo: getImageUrl(mission.organizationLogo),
    } as TalentJob;

    jobs.push(job);
  }

  return jobs;
}
