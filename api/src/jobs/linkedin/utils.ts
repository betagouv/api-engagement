import { XMLBuilder } from "fast-xml-parser";

import MissionModel from "../../models/mission";
import { OBJECT_ACL, putObject } from "../../services/s3";
import { Mission } from "../../types";
import { LINKEDIN_XML_URL } from "./config";
import { missionToLinkedinJob } from "./transformers";
import { LinkedInJob } from "./types";

export async function getMissions(where: { [key: string]: any }): Promise<Mission[]> {
  const missions = await MissionModel.find(where).sort({ createdAt: "asc" }).lean();
  return missions;
}

export function generateJvaJobs(missions: Mission[]): { jobs: LinkedInJob[]; expired: number; skipped: number } {
  const jobs = [] as LinkedInJob[];
  let expired = 0;
  let skipped = 0;

  for (let i = 0; i < missions.length; i++) {
    const mission = missions[i];
    const job = missionToLinkedinJob(mission, "jeveuxaider.gouv.fr");
    if (!job) {
      skipped++;
      continue;
    }
    job.description += `<br><br><br> Activité : [${mission.activity}]`;
    if (job.expirationDate && new Date(job.expirationDate).getTime() < Date.now()) {
      expired++;
      continue;
    }
    jobs.push(job);
  }

  return { jobs, expired, skipped };
}

export function generatePartnersJobs(missions: Mission[]): { jobs: LinkedInJob[]; skipped: number } {
  const jobs = [] as LinkedInJob[];
  let skipped = 0;

  let slot = 0;
  for (let i = 0; i < missions.length; i++) {
    const mission = missions[i];
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

  return { jobs, skipped };
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
  "isRemote",
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
