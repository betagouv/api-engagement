import { Mission } from "../../types";
import { getMissionTrackedApplicationUrl } from "../../utils";
import { LINKEDIN_COMPANY_ID, LINKEDIN_ID, LINKEDIN_INDUSTRY_CODE } from "./config";
import { LinkedInJob } from "./types";

export function missionToLinkedinJob(mission: Mission, defaultCompany: string): LinkedInJob | null {
  const startDate = new Date(mission.startAt);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const initialDescription = diffDays % 6 < 3;

  if (!mission.title) {
    return null;
  }
  if (!mission.description) {
    return null;
  }
  if (!mission.organizationName) {
    return null;
  }
  if (!mission.city) {
    return null;
  }
  if (!mission.region) {
    return null;
  }
  if (!mission.region) {
    return null;
  }
  if (!mission.country) {
    return null;
  }

  const job = {
    jobtype: "VOLUNTEER",
    partnerJobId: String(mission._id),
    applyUrl: getMissionTrackedApplicationUrl(mission, LINKEDIN_ID),
    title: `Bénévolat - ${mission.title}`,
    description: initialDescription
      ? `Ceci est une mission de bénévolat pour <strong>${mission.organizationName}</strong><br>${mission.description.replace(/\n/g, "<br>").replace(/\u000b/g, "")}`
      : `<strong>${mission.organizationName}</strong> vous propose une mission de bénévolat<br>${mission.description
          .replace(/\n/g, "<br>")
          .replace(/\u000b/g, "")}<br><br>Type : missions-benevolat`,
    company: LINKEDIN_COMPANY_ID[mission.organizationName] ? mission.organizationName : defaultCompany,
    location: `${mission.city}, ${mission.country} ${mission.region}`,
    country: mission.country,
    city: mission.city,
    postalCode: mission.postalCode,
    listDate: new Date(mission.createdAt).toISOString(),
    industry: mission.domain,
    industryCodes: LINKEDIN_INDUSTRY_CODE[mission.domain] ? [{ industryCode: LINKEDIN_INDUSTRY_CODE[mission.domain] }] : undefined,
    isRemote: mission.remote === "no" ? "On-site" : mission.remote === "full" ? "Remote" : "Hybrid",
  } as LinkedInJob;
  if (mission.endAt) {
    job.expirationDate = new Date(mission.endAt).toISOString();
  }
  job.companyId = LINKEDIN_COMPANY_ID[job.company];

  if (job.partnerJobId.length > 300) {
    return null;
  }
  if (!job.title || job.title.length > 300) {
    return null;
  }
  if (!job.description || job.description.length < 100 || job.description.length > 25000) {
    return null;
  }
  if (job.company.length > 300) {
    return null;
  }
  if (job.location.length > 300) {
    return null;
  }
  if (job.country && job.country.length > 2) {
    return null;
  }

  return job;
}
