import { Mission } from "../../types";
import { getMissionTrackedApplicationUrl } from "../../utils";
import { LINKEDIN_COMPANY_ID, LINKEDIN_INDUSTRY_CODE, PUBLISHER_IDS } from "./config";
import { LinkedInJob } from "./types";

// Doc: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds-development-guide?view=li-lts-2025-04

export function missionToLinkedinJob(mission: Mission, defaultCompany: string): LinkedInJob | null {
  const startDate = new Date(mission.startAt);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const initialDescription = diffDays % 6 < 3;

  if (!mission.country) {
    mission.country = "FR";
  }
  if (!mission.title) {
    return null;
  }
  if (!mission.description) {
    return null;
  }
  if (!mission.organizationName) {
    return null;
  }

  const job = {
    jobtype: "VOLUNTEER",
    partnerJobId: String(mission._id),
    applyUrl: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.LINKEDIN),
    title: `Bénévolat - ${mission.title}`,
    description: initialDescription
      ? `Ceci est une mission de bénévolat pour <strong>${mission.organizationName}</strong><br>${mission.description.replace(/\n/g, "<br>").replace(/\u000b/g, "")}`
      : `<strong>${mission.organizationName}</strong> vous propose une mission de bénévolat<br>${mission.description
          .replace(/\n/g, "<br>")
          .replace(/\u000b/g, "")}<br><br>Type : missions-benevolat`,
    company: LINKEDIN_COMPANY_ID[mission.organizationName] ? mission.organizationName : defaultCompany,
    location: `${mission.city ? `${mission.city}, ` : ""}${mission.country === "FR" ? "France" : mission.country}${mission.region ? `, ${mission.region}` : ""}`,
    country: mission.country,
    city: mission.city,
    postalCode: mission.postalCode,
    listDate: new Date(mission.createdAt).toISOString(),
    industry: mission.domain,
    industryCodes: LINKEDIN_INDUSTRY_CODE[mission.domain] ? [{ industryCode: LINKEDIN_INDUSTRY_CODE[mission.domain] }] : undefined,
    workplaceTypes: mission.remote === "no" ? "On-site" : mission.remote === "full" ? "Remote" : "Hybrid",
  } as LinkedInJob;
  if (mission.endAt) {
    job.expirationDate = new Date(mission.endAt).toISOString();
  }
  job.companyId = LINKEDIN_COMPANY_ID[job.company];

  if (!job.description || job.description.length < 100 || job.description.length > 25000) {
    return null;
  }
  if (!job.country || job.country.length > 2) {
    return null;
  }

  return job;
}
