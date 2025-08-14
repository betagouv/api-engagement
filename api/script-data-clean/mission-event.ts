/**
 * Script the __history field of the mission collection and to migrate it to the mission-event collection
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import "../src/db/mongo";

// import MissionEventModel from "../src/models/mission-event";
import MissionModel from "../src/models/mission";

import { Mission, MissionEvent } from "../src/types";
import { IMPORT_FIELDS_TO_COMPARE } from "../src/utils/mission";

const BATCH_SIZE = 10000;

const FIELDS = [...IMPORT_FIELDS_TO_COMPARE, "deletedAt"];

const transformMissionHistoryToMissionEvent = (mission: Mission) => {
  const events: MissionEvent[] = [];

  console.log("mission", mission.__history?.length);
  if (!mission.__history) {
    return events;
  }

  let initialMission = {} as Mission;

  const createHistory = mission.__history.find((h) => h.metadata?.action === "created");
  if (createHistory) {
    console.log("create", createHistory.date);
    events.push({
      type: "create",
      changes: null,
      fields: [] as string[],
      createdAt: createHistory.date,
    } as MissionEvent);
    initialMission = createHistory.state as Mission;
  }

  for (const history of mission.__history.sort((a, b) => a.date.getTime() - b.date.getTime())) {
    if (!history.metadata || history.metadata.action === "created") {
      continue;
    }

    if (history.metadata.action === "updated") {
      const changes = {} as Record<string, { previous: any; current: any }>;

      let fields = Object.keys(history.state).filter((field) => FIELDS.includes(field as keyof Mission));

      for (const field of fields) {
        if (field === "deletedAt") {
          if (!initialMission.deletedAt && !history.state.deletedAt) {
            fields = fields.filter((field) => field !== "deletedAt");
            continue;
          }
          changes[field] = {
            previous: initialMission.deletedAt,
            current: history.state.deletedAt,
          };
          continue;
        }

        changes[field] = {
          previous: initialMission[field],
          current: history.state[field],
        };

        initialMission[field] = history.state[field];
      }

      console.log("fields", fields);
      console.log("changes", changes);
      if (Object.keys(changes).length > 0) {
        events.push({
          type: changes.deletedAt ? "delete" : "update",
          changes,
          fields,
          createdAt: history.date,
        } as MissionEvent);
      }

      continue;
    }
    console.log(history.metadata.action);
  }

  return events;
};

const main = async () => {
  // const res = await MissionModel.countDocuments({ deletedAt: { $gt: new Date("2025-08-14T10:28:53.361") } });
  // console.log(res);
  // const res2 = await MissionModel.updateMany({ deletedAt: { $gt: new Date("2025-08-14T10:28:53.361") } }, { $set: { deletedAt: null } });
  // console.log(res2);
  // const res = await MissionEventModel.countDocuments({ lastExportedToPgAt: { $gt: new Date("2025-08-14T10:28:53.361") } });
  // console.log(res);
  // const res2 = await MissionEventModel.updateMany({ lastExportedToPgAt: { $gt: new Date("2025-08-14T10:28:53.361") } }, { $set: { lastExportedToPgAt: null } });
  // console.log(res2);

  const where = {
    // __history: { $exists: true },
    // _id: "5f96fe4c1b55850008fac57d",
    // _id: "6824eafdb31b0edbfe4b51ec",
    _id: "682739ebb6f2ee2e955996eb",
  };

  const count = await MissionModel.countDocuments(where);
  console.log(`Found ${count} missions with __history`);

  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batch = await MissionModel.find(where).skip(i).limit(BATCH_SIZE).lean();
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(count / BATCH_SIZE)}`);
    for (const mission of batch) {
      const events = transformMissionHistoryToMissionEvent(mission);
      // console.log(events);
      // await MissionEventModel.insertMany(events);
    }
  }
};

if (require.main === module) {
  const start = new Date();
  console.log("Start migration at ", start.toLocaleString());
  main()
    .then(() => {
      console.log("Total time", (Date.now() - start.getTime()) / 1000, "seconds");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
