import { GRIMPIO_XML_URL } from "@/jobs/grimpio/config";
import { missionToGrimpioJob } from "@/jobs/grimpio/transformers";
import { GrimpioJob } from "@/jobs/grimpio/types";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord } from "@/types/mission";
import { buildFeedXml } from "@/utils/xml";

export { getMissionsCursor } from "@/utils/mission-cursor";

export async function generateJobsByPublisher(
  missionsCursor: AsyncIterable<MissionRecord>
): Promise<{ jobsByPublisher: Map<string, GrimpioJob[]>; expired: number; processed: number }> {
  const jobsByPublisher = new Map<string, GrimpioJob[]>();
  let expired = 0;
  let processed = 0;

  for await (const mission of missionsCursor) {
    processed++;
    // Check if mission has expired (using endAt if available)
    if (mission.endAt && new Date(mission.endAt).getTime() < Date.now()) {
      expired++;
      continue;
    }
    const data = missionToGrimpioJob(mission);
    const jobs = jobsByPublisher.get(mission.publisherId) ?? [];
    jobs.push(data);
    jobsByPublisher.set(mission.publisherId, jobs);
  }

  return { jobsByPublisher, expired, processed };
}

const CDATA_KEYS = ["title", "url", "contractType", "enterpriseName", "description", "enterpriseIndustry", "externalId", "logo", "remoteJob", "duration", "startingDate"];

export function generateXML(data: GrimpioJob[]) {
  return buildFeedXml({ publisher: "api-engagement", publisherurl: "https://api-engagement.beta.gouv.fr/", lastbuilddate: new Date().toUTCString(), job: data }, CDATA_KEYS);
}

export async function storeXML(xml: string, publisherId: string): Promise<string> {
  const date = new Date().toISOString().split("T")[0];

  await putObject(`xml/grimpio-${publisherId}-${date}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  await putObject(`xml/grimpio-${publisherId}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  return `${GRIMPIO_XML_URL}-${publisherId}-${date}.xml`;
}
