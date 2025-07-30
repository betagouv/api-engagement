import { XMLBuilder } from "fast-xml-parser";

import MissionModel from "../../models/mission";
import { OBJECT_ACL, putObject } from "../../services/s3";
import { Mission } from "../../types";
import { AUDIENCE_MAPPING, DOMAIN_MAPPING, LINKEDIN_XML_URL } from "./config";
import { missionToLinkedinJob } from "./transformers";
import { LinkedInJob } from "./types";

export function getMissionsCursor(where: { [key: string]: any }) {
  return MissionModel.find(where).sort({ createdAt: "asc" }).limit(10).lean().cursor();
}

export async function generateJvaJobs(missionsCursor: AsyncIterable<Mission>): Promise<{ jobs: LinkedInJob[]; expired: number; skipped: number; processed: number }> {
  const jobs = [] as LinkedInJob[];
  let expired = 0;
  let skipped = 0;
  let processed = 0;

  for await (const mission of missionsCursor) {
    processed++;
    const job = missionToLinkedinJob(mission, "jeveuxaider.gouv.fr");
    if (!job) {
      skipped++;
      continue;
    }
    if (job.expirationDate && new Date(job.expirationDate).getTime() < Date.now()) {
      expired++;
      continue;
    }
    jobs.push(job);
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
    const job = missionToLinkedinJob(mission, "benevolt");
    if (!job) {
      skipped++;
      continue;
    }
    if (slot >= 50) {
      break;
    }
    job.description += `<br><br><br> Mission proposée par notre partenaire Benevolt`;
    job.companyId = "11100845";
    job.company = "jeveuxaider.gouv.fr";
    jobs.push(job);
    slot++;
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

export function getDomainLabel(domain: string): string {
  return DOMAIN_MAPPING[domain] || DOMAIN_MAPPING["autre"];
}

export function getAudienceLabel(audience: string): string {
  return AUDIENCE_MAPPING[audience] || AUDIENCE_MAPPING["any_public"];
}
