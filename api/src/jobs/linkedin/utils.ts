import { XMLBuilder } from "fast-xml-parser";

import MissionModel from "../../models/mission";
import { OBJECT_ACL, putObject } from "../../services/s3";
import { Mission } from "../../types";
import { LINKEDIN_XML_URL, MULTI_ADDRESSES_MISSIONS } from "./config";
import { missionToLinkedinJobs } from "./transformers";
import { LinkedInJob } from "./types";

export function getMissionsCursor(where: { [key: string]: any }) {
  return MissionModel.find(where).sort({ createdAt: "asc" }).lean().cursor();
}

export async function generateJvaJobs(missionsCursor: AsyncIterable<Mission>): Promise<{ jobs: LinkedInJob[]; expired: number; skipped: number; processed: number }> {
  const jobs = [] as LinkedInJob[];
  let expired = 0;
  let skipped = 0;
  let processed = 0;

  for await (const mission of missionsCursor) {
    processed++;

    // TODO: remove this limit later
    const isMultiAddresses = isMissionEligibleForMultiAddresses(mission);
    if (isMultiAddresses) {
      console.log(`Multi address slot used for mission ${mission._id} (${mission.title})`);
    }

    const linkedinJobs = missionToLinkedinJobs(mission, "jeveuxaider.gouv.fr", isMultiAddresses);
    if (linkedinJobs.length === 0) {
      skipped++;
      continue;
    }

    for (const job of linkedinJobs) {
      job.description += `<br><br><br> Activité : [${mission.activity}]`;
      if (job.expirationDate && new Date(job.expirationDate).getTime() < Date.now()) {
        expired++;
        continue;
      }
      jobs.push(job);
    }
  }

  return { jobs, expired, skipped, processed };
}

export async function generatePartnersJobs(missionsCursor: AsyncIterable<Mission>): Promise<{ jobs: LinkedInJob[]; skipped: number; processed: number }> {
  const jobs = [] as LinkedInJob[];
  let skipped = 0;
  let processed = 0;

  let slot = 0;
  for await (const mission of missionsCursor) {
    processed++;
    // Multi address disabled for partners for now
    const linkedinJobs = missionToLinkedinJobs(mission, "benevolt", false);
    if (linkedinJobs.length === 0) {
      skipped++;
      continue;
    }
    if (slot >= 50) {
      break;
    }
    for (const job of jobs) {
      job.description += `<br><br><br> Mission proposée par notre partenaire Benevolt`;
      job.companyId = "11100845";
      job.company = "jeveuxaider.gouv.fr";
      jobs.push(job);
      slot++;
    }
  }

  return { jobs, skipped, processed };
}

const CDATA_KEYS = [
  "partnerJobId",
  "description",
  "title",
  "applyUrl",
  "company",
  "companyId",
  "location",
  "city",
  "country",
  "postalCode",
  "expirationDate",
  "listDate",
  "industry",
  "industryCode",
  "workplaceTypes",
];

export function generateXML(data: LinkedInJob[]) {
  const obj = {
    source: {
      publisher: "api-engagement",
      publisherUrl: "https://api-engagement.beta.gouv.fr/",
      lastBuildDate: new Date().toUTCString(),
      expectedJobCount: { "#cdata": data.length },
      job: data.map((job: { [key: string]: any }) =>
        Object.keys(job).reduce(
          (acc, key) => {
            acc[key] = CDATA_KEYS.includes(key) ? { "#cdata": job[key] } : job[key];
            return acc;
          },
          {} as { [key: string]: any }
        )
      ),
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
    cdataPropName: "#cdata",
  });

  return builder.build(obj);
}

export async function storeXML(xml: string): Promise<string> {
  const date = new Date().toISOString().split("T")[0];

  await putObject(`xml/linkedin-${date}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  await putObject("xml/linkedin.xml", xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  return `${LINKEDIN_XML_URL}-${date}.xml`;
}

function isMissionEligibleForMultiAddresses(mission: Mission): boolean {
  return MULTI_ADDRESSES_MISSIONS.includes(mission._id?.toString() || "");
}
