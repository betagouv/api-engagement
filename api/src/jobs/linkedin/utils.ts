import { AUDIENCE_MAPPING, DOMAIN_MAPPING, LINKEDIN_XML_URL } from "@/jobs/linkedin/config";
import { missionToLinkedinJob } from "@/jobs/linkedin/transformers";
import { LinkedInJob } from "@/jobs/linkedin/types";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord } from "@/types/mission";
import { buildFeedXml } from "@/utils/xml";

export { getMissionsCursor } from "@/utils/mission-cursor";

export async function generateJvaJobs(missionsCursor: AsyncIterable<MissionRecord>): Promise<{ jobs: LinkedInJob[]; expired: number; skipped: number; processed: number }> {
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

export async function generatePartnersJobs(missionsCursor: AsyncIterable<MissionRecord>): Promise<{ jobs: LinkedInJob[]; skipped: number; processed: number }> {
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
  "alternateLocation",
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
  return buildFeedXml(
    {
      publisher: "api-engagement",
      publisherUrl: "https://api-engagement.beta.gouv.fr/",
      lastBuildDate: new Date().toUTCString(),
      expectedJobCount: { "#cdata": data.length },
      job: data,
    },
    CDATA_KEYS
  );
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
