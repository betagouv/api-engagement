import { AddressItem, Mission } from "../../types";
import { getMissionTrackedApplicationUrl } from "../../utils";
import { LINKEDIN_COMPANY_ID, LINKEDIN_INDUSTRY_CODE, LINKEDIN_PUBLISHER_ID } from "./config";
import { LinkedInJob } from "./types";
import { getAudienceLabel, getDomainLabel } from "./utils";

/**
 * Format mission to Linkedin Job
 * Doc: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds-development-guide?view=li-lts-2025-04
 *
 * @param mission - Mission to format
 * @param defaultCompany - Default company to use if organizationName is not in LINKEDIN_COMPANY_ID
 * @returns LinkedInJob | null
 */
export function missionToLinkedinJob(mission: Mission, defaultCompany: string): LinkedInJob | null {
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
    applyUrl: getMissionTrackedApplicationUrl(mission, LINKEDIN_PUBLISHER_ID),
    title: `Bénévolat - ${mission.title}`,
    description: (() => {
      const blocks: string[] = [];
      const startDate = new Date(mission.startAt);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let title = "";

      // Switch main title based on diffDays to alternate on 3 days basis
      if (diffDays % 6 < 3) {
        title = `<b>${mission.organizationName}</b> vous propose une mission de bénévolat`;
      } else {
        title = `Ceci est une mission de bénévolat pour <b>${mission.organizationName}</b>`;
      }

      blocks.push(`<p><b>Type de mission : </b>${title}</p>`);

      if (mission.domain) {
        blocks.push(`<p><b>Domaine d'activité : </b>${getDomainLabel(mission.domain)}</p>`);
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

      if (Array.isArray(mission.audience) && mission.audience.length > 0) {
        blocks.push("<p><b>Public accompagné durant la mission : </b></p>");
        blocks.push(`<p>${mission.audience.map((audience) => getAudienceLabel(audience)).join(" - ")}</p>`);
      }

      if (mission.schedule) {
        blocks.push(`<p><b>Durée de la mission : </b>${mission.schedule}</p>`);
      }

      if (mission.openToMinors === "no") {
        blocks.push(`<p><b>Âge minimum : </b>18 ans minimum</p>`);
      }
      return blocks.join("\n");
    })(),
    company: LINKEDIN_COMPANY_ID[mission.organizationName] ? mission.organizationName : defaultCompany,
    location: mission.addresses.length > 0 ? formatLocation(mission.addresses[0]) : "",
    alternateLocations: mission.addresses.length > 1 ? { alternateLocation: mission.addresses.map((address) => formatLocation(address)).slice(0, 7) } : undefined, // Limit to 7 locations
    country: (mission.addresses?.length ?? 0) === 0 ? mission.country || "FR" : undefined,
    city: (mission.addresses?.length ?? 0) === 0 ? mission.city : undefined,
    postalCode: (mission.addresses?.length ?? 0) === 0 ? mission.postalCode : undefined,
    listDate: new Date(mission.createdAt).toISOString(),
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
  if (job.country && job.country.length > 2) {
    return null;
  }

  return job;
}

export function formatLocation(address: AddressItem) {
  return `${address.city ? `${address.city}, ` : ""}${address.country === "FR" ? "France" : address.country}`;
}
