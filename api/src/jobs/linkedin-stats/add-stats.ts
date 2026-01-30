import { PUBLISHER_IDS } from "../../config";
import { captureException } from "../../error";
import { missionService } from "../../services/mission";
import { statEventService } from "../../services/stat-event";
import { StatEventRecord } from "../../types";

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

const getDate = (date: string, full: boolean = false) => {
  const s = date.split("-");
  if (full) {
    return new Date(parseInt(s[0]), parseInt(s[1]) - 1, parseInt(s[2]) + 1, 0, 0, 0, -1);
  } else {
    return new Date(parseInt(s[0]), parseInt(s[1]) - 1, parseInt(s[2]));
  }
};

const parseRow = async (row: (string | number)[], from: Date, to: Date, sourceId: string) => {
  const missionId = row[ROWS.indexOf("Employer Job ID")];
  if (!missionId) {
    console.info(`[Linkedin Stats] No Mission ID found in row`, row.toString());
    return;
  }

  const stateStartDate = getDate(row[ROWS.indexOf("State Start Date")].toString());
  const stateEndDate = row[ROWS.indexOf("State End Date")] ? getDate(row[ROWS.indexOf("State End Date")].toString(), true) : null;

  const views = parseInt(row[ROWS.indexOf("Total Views")].toString()) || 0;
  try {
    const data = [] as StatEventRecord[];

    let mission = await missionService.findOneMission(missionId.toString());
    if (!mission) {
      const existingStat = await statEventService.findOneStatEventByMissionId(missionId.toString());
      if (!existingStat) {
        console.info(`[Linkedin Stats] Mission ${missionId} not found`);
        return;
      } else {
        mission = existingStat.missionClientId ? await missionService.findMissionByClientAndPublisher(existingStat.missionClientId.toString(), existingStat.toPublisherId) : null;
        if (!mission) {
          console.info(`[Linkedin Stats] Mission ${missionId} not found`);
          return;
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
      } as StatEventRecord);
    }

    return data;
  } catch (error: any) {
    captureException(error, "[Linkedin Stats] Error while processing row");
  }
};

export const processData = async (data: (string | number)[][], from: Date, to: Date, sourceId: string) => {
  const result = {
    created: 0,
    failed: { data: [] as any[] },
  };

  const batchSize = 100;
  const pendingPrints: StatEventRecord[] = [];

  const flushPendingPrints = async () => {
    if (!pendingPrints.length) {
      return;
    }

    const printsToPersist = pendingPrints.splice(0, pendingPrints.length);
    const concurrency = 10;
    for (let i = 0; i < printsToPersist.length; i += concurrency) {
      const slice = printsToPersist.slice(i, i + concurrency);
      const settledPrints = await Promise.allSettled(
        slice.map(async (print) => {
          try {
            const created = await statEventService.createStatEvent(print);
            return { print, created };
          } catch (error) {
            throw { error, print };
          }
        })
      );

      settledPrints.forEach((printResult) => {
        if (printResult.status === "fulfilled") {
          const { print, created } = printResult.value;
          if (created) {
            result.created += 1;
          } else {
            console.error(`[Linkedin Stats] Failed to create stat`, print);
            result.failed.data.push({
              error: "Failed to create stat",
              stat: print,
            });
          }
        } else {
          const { error, print } = printResult.reason ?? {};
          captureException(error ?? printResult.reason, "[Linkedin Stats] Failed to create stat");
          result.failed.data.push({
            error: error?.message ?? "Failed to create stat",
            stat: print,
          });
        }
      });
    }
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

    pendingPrints.push(...res);

    if (pendingPrints.length >= batchSize) {
      await flushPendingPrints();
    }
  }

  await flushPendingPrints();
  return result;
};
