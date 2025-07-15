import { Mission } from "../../types";
import { getMissionTrackedApplicationUrl } from "../../utils";
import { LINKEDIN_COMPANY_ID, LINKEDIN_ID, LINKEDIN_INDUSTRY_CODE } from "./config";
import { LinkedInJob } from "./types";

/**
 * Format mission to Linkedin Job
 * Doc: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds-development-guide?view=li-lts-2025-04
 *
 * @param mission - Mission to format
 * @param defaultCompany - Default company to use if organizationName is not in LINKEDIN_COMPANY_ID
 * @returns LinkedInJob | null
 */
export function missionToLinkedinJob(mission: Mission, defaultCompany: string): LinkedInJob | null {
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
    applyUrl: getMissionTrackedApplicationUrl(mission, LINKEDIN_ID),
    title: `Bénévolat - ${mission.title}`,
    description: (() => {
      const blocks: string[] = [];
      const startDate = new Date(mission.startAt);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      blocks.push("<p><b>Type de mission : </b><br>");

      // Switch main title based on diffDays to alternate on 3 days basis
      if (diffDays % 6 < 3) {
        blocks.push(`<p><b>${mission.organizationName}</b> vous propose une mission de bénévolat</p>`);
      } else {
        blocks.push(`<p>Ceci est une mission de bénévolat pour <b>${mission.organizationName}</b></p>`);
      }

      if (mission.domain) {
        blocks.push("<p><b>Domaine d'activité</b></p>");
        blocks.push(`<p>${mission.domain}</p>`);
      }

      if (mission.descriptionHtml) {
        blocks.push(mission.descriptionHtml);
      }

      if (Array.isArray(mission.requirements) && mission.requirements.length > 0) {
        blocks.push("<p><b>Pré-requis : </b></p>");
        blocks.push("<ol>");
        mission.requirements.forEach((req) => {
          blocks.push(`  <li>${req}</li>`);
        });
        blocks.push("</ol>");
      }

      if (mission.audience) {
        blocks.push("<p><b>Public accompagné durant la mission : </b></p>");
        blocks.push(`<p>${mission.audience}</p>`);
      }

      if (mission.schedule) {
        blocks.push("<p><b>Durée de la mission : </b></p>");
        blocks.push(`<p>${mission.schedule}</p>`);
      }

      if (mission.openToMinors === "no") {
        blocks.push("<p><b>Âge minimum : </b></p>");
        blocks.push(`<p>18 ans minimum.</p>`);
      }
      return blocks.join("\n");
    })(),
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
