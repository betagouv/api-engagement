import { JVA_LOGO_URL } from "@/config";
import { CATEGORY_MAPPING, TALENT_XML_URL } from "@/jobs/talent/config";
import { missionToTalentJob } from "@/jobs/talent/transformers";
import { TalentJob } from "@/jobs/talent/types";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord } from "@/types/mission";
import { buildFeedXml } from "@/utils/xml";

export { getMissionsCursor } from "@/utils/mission-cursor";

export async function generateJobs(missionsCursor: AsyncIterable<MissionRecord>): Promise<{ jobs: TalentJob[]; expired: number; processed: number }> {
  const jobs = [] as TalentJob[];
  let expired = 0;
  let processed = 0;

  for await (const mission of missionsCursor) {
    processed++;
    const data = missionToTalentJob(mission);
    for (const job of data) {
      if (job.expirationdate && new Date(job.expirationdate).getTime() < Date.now()) {
        expired++;
        continue;
      }
      jobs.push(job);
    }
  }

  return { jobs, expired, processed };
}

export function getImageUrl(image?: string) {
  if (image && image.endsWith(".png")) {
    return image;
  }
  return JVA_LOGO_URL;
}

const CDATA_KEYS = [
  "referencenumber",
  "title",
  "description",
  "company",
  "city",
  "state",
  "country",
  "dateposted",
  "url",
  "expirationdate",
  "streetaddress",
  "postalcode",
  "jobtype",
  "isremote",
  "benefit",
  "category",
  "logo",
  "experience",
  "cpc",
  "salary",
];

export function generateXML(data: TalentJob[]) {
  return buildFeedXml(
    {
      publisher: "api-engagement",
      publisherurl: "https://api-engagement.beta.gouv.fr/",
      lastbuilddate: new Date().toUTCString(),
      job: data,
    },
    CDATA_KEYS
  );
}

export async function storeXML(xml: string): Promise<string> {
  const date = new Date().toISOString().split("T")[0];

  await putObject(`xml/talent-${date}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  await putObject("xml/talent.xml", xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  return `${TALENT_XML_URL}-${date}.xml`;
}

export function getActivityCategory(activity: string): string | undefined {
  return CATEGORY_MAPPING[activity as keyof typeof CATEGORY_MAPPING];
}
