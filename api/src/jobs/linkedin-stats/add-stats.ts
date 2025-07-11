import { BulkOperationContainer } from "@elastic/elasticsearch/api/types";
import { PUBLISHER_IDS, STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import { captureException, captureMessage } from "../../error";
import MissionModel from "../../models/mission";
import { Stats } from "../../types";

const ROWS = [
  "LinkedIn Job ID",
  "Employer Job ID",
  "Company Apply URL",
  "Job Contract",
  "Project Status",
  "Posted Company",
  "Posted Company ID",
  "Company Hiring For",
  "Job Poster",
  "Hiring Project Owner",
  "Current Status",
  "State Start Date",
  "State End Date",
  "Original List Date",
  "Job Title",
  "Standardized Title",
  "Location",
  "Country",
  "Workplace Type",
  "Industry",
  "Function",
  "Skills",
  "Application Collection Method",
  "Days Open in Report Date Range",
  "Total Views",
  "Total Apply Clicks",
  "Unique Viewers",
  "Unique Apply Clicks",
  "Apply Rate %",
  "Applications",
  "Completion Rate %",
  "Job Post Type",
  "ATS Posting Method",
  "ATS Posting Method Detail",
];

const BULK_SIZE = 1000;

const getDate = (date: string, full: boolean = false) => {
  const s = date.split("-");
  if (full) {
    return new Date(parseInt(s[0]), parseInt(s[1]) - 1, parseInt(s[2]) + 1, 0, 0, 0, -1);
  } else {
    return new Date(parseInt(s[0]), parseInt(s[1]) - 1, parseInt(s[2]));
  }
};

// Temporary fix for missing missions
const MISSION_NOT_FOUND = {
  "650c884e161246d96b53be2e": "6703bbb473fbd982c10127e7",
  "63922907f6c879268f834d8b": "6703bbb573fbd982c1012b26",
  "651c0605c2543ccde2ebe526": "6703bbb473fbd982c10126a5",
  "6526e65a2805290904c6f5a6": "6703bbb473fbd982c10128e1",
  "63d3c010311743b0e0d2cfb8": "6703bbb473fbd982c1012628",
  "633d5f02c5e3d005ebd9c27b": "6703bb4273fbd982c1011811",
  " 606d20efeea0d9070b9ab67f": "6703bbb573fbd982c1012b7a",
  "b30a0fd8-2a29-471c-8667-a0def87352ca": "",
  "6509e557480f32a674f90d9b": "6703bad373fbd982c100f8cd",
  "65034dcd6d92368ab3e62b2e": "6703bad173fbd982c100ec8b",
  "650b36ce161246d96b4dec94": "6703bb3c73fbd982c101003a",
  "645699282e85e7d7b1a8b805": "6703bb4273fbd982c1011a59",
  "64092877f563558c4ff64a5b": "6703bb4173fbd982c10113f7",
  "63add8a958b361a136463939": "6703bb4173fbd982c1011308",
  "64092877f563558c4ff64be6": "6703bb4173fbd982c10113f6",
  "6215b7b5ffecb707a0fb2a0d": "6703bb4173fbd982c10113f2",
  "62283732285e0d07a06a1c2b": "6703bb4173fbd982c101139c",
  "63e2408e50f05c74605803f0": "6703bb3f73fbd982c1010d44",
  "640a21e45c6aa53a9169a6ec": "6703bb4173fbd982c1011403",
} as { [key: string]: string };

const parseRow = async (row: (string | number)[], from: Date, to: Date, sourceId: string) => {
  const missionId = row[ROWS.indexOf("Employer Job ID")];
  if (!missionId) {
    captureMessage(`[Linkedin Stats] No Mission ID found in row`, row.toString());
    return;
  }

  const stateStartDate = getDate(row[ROWS.indexOf("State Start Date")].toString());
  const stateEndDate = row[ROWS.indexOf("State End Date")] ? getDate(row[ROWS.indexOf("State End Date")].toString(), true) : null;

  const views = parseInt(row[ROWS.indexOf("Total Views")].toString()) || 0;
  try {
    const data = [] as Stats[];

    let mission = await MissionModel.findOne({ _old_ids: { $in: [missionId] } });
    if (!mission) {
      const response2 = await esClient.search({
        index: STATS_INDEX,
        body: { query: { term: { "missionId.keyword": missionId } }, size: 1 },
      });
      if (response2.body.hits.total.value === 0) {
        if (MISSION_NOT_FOUND[missionId.toString()]) {
          mission = await MissionModel.findById(MISSION_NOT_FOUND[missionId.toString()]);
          if (!mission) {
            captureMessage(`[Linkedin Stats] Mission ${missionId} not found`);
            return;
          }
        } else {
          captureMessage(`[Linkedin Stats] Mission ${missionId} not found`);
          return;
        }
      } else {
        const stats = {
          _id: response2.body.hits.hits[0]._id,
          ...response2.body.hits.hits[0]._source,
        } as Stats;
        mission = await MissionModel.findOne({
          clientId: stats.missionClientId?.toString(),
          publisherId: stats.toPublisherId,
        });
        if (!mission) {
          if (MISSION_NOT_FOUND[missionId.toString()]) {
            mission = await MissionModel.findById(MISSION_NOT_FOUND[missionId.toString()]);
            if (!mission) {
              captureMessage(`[Linkedin Stats] Mission ${missionId} not found`);
              return;
            }
          } else {
            captureMessage(`[Linkedin Stats] Mission ${missionId} not found`);
            return;
          }
        }
      }
    }

    const endInterval = !stateEndDate || stateEndDate > to || stateEndDate < from ? to : stateEndDate;
    const startInterval = stateStartDate < from || (stateEndDate && stateEndDate < from) ? from : stateStartDate > endInterval ? endInterval : stateStartDate;

    const intervalPrints = (endInterval.getTime() - startInterval.getTime()) / (views - 1 || 1);

    for (let i = 0; i < views; i++) {
      data.push({
        createdAt: new Date(startInterval.getTime() + i * intervalPrints),
        type: "print",
        host: "https://www.linkedin.com",
        tag: "report",
        source: "publisher",
        sourceName: "Linkedin Report",
        sourceId,
        missionId: mission._id.toString(),
        missionClientId: mission.clientId,
        missionDomain: mission.domain,
        missionTitle: mission.title,
        missionPostalCode: mission.postalCode,
        missionDepartmentName: mission.departmentName,
        missionOrganizationName: mission.organizationName,
        missionOrganizationId: mission.organizationId,
        toPublisherId: mission.publisherId,
        toPublisherName: mission.publisherName,
        fromPublisherId: PUBLISHER_IDS.LINKEDIN,
        fromPublisherName: "Linkedin",
      } as Stats);
    }

    return data;
  } catch (error: any) {
    captureException(error, "[Linkedin Stats] Error while processing row");
  }
};

export const processData = async (data: (string | number)[][], from: Date, to: Date, sourceId: string) => {
  const bulk = [] as (BulkOperationContainer | Stats)[];
  const result = {
    created: 0,
    failed: { data: [] as any[] },
  };

  for (let i = 1; i < data.length; i++) {
    if (i % 100 === 0) {
      console.log(`[Linkedin Stats] Processed ${i} rows`);
    }

    const row = data[i];
    if (row[0] === "LinkedIn Job ID") {
      continue;
    }
    const res = await parseRow(row, from, to, sourceId);
    if (!res) {
      continue;
    }

    res.forEach((print) => {
      bulk.push({ index: { _index: STATS_INDEX } });
      bulk.push(print);
    });

    if (bulk.length >= BULK_SIZE || i === data.length - 1) {
      const { body } = await esClient.bulk({ refresh: true, body: bulk });
      result.created += body.items.filter((e: any) => e.index._index === STATS_INDEX).length;
      if (body.errors) {
        const errors = body.items.filter((e: any) => e.index.error);
        errors.forEach((e: any) => {
          console.error(JSON.stringify(e, null, 2));
        });
        captureException(`ES bulk failed`, JSON.stringify(errors, null, 2));
        result.failed.data.push(...errors);
      }
      bulk.length = 0;
    }
  }
  return result;
};
