/**
 * Script the __history field of the mission collection and to migrate it to the mission-event collection
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import "../src/db/mongo";

import MissionModel from "../src/models/mission";
import { Mission, MissionEvent } from "../src/types";
import { FIELDS_TO_COMPARE } from "../src/utils/mission";

const BATCH_SIZE = 10000;

const transformMissionHistoryToMissionEvent = (mission: Mission) => {
  const events: MissionEvent[] = [];

  console.log("mission", mission.__history?.length);
  if (!mission.__history) {
    return events;
  }

  let initialMission = null as Mission | null;
  for (const history of mission.__history) {
    if (!history.metadata) {
      continue;
    }

    if (history.metadata.action === "created") {
      console.log("create", history.date);
      events.push({
        type: "create",
        changes: null,
        fields: [] as string[],
        createdAt: history.date,
      } as MissionEvent);
      initialMission = history.state as Mission;
      continue;
    }

    if (history.metadata.action === "updated") {
      const changes = {} as Record<string, { previous: any; current: any }>;

      const fields = Object.keys(history.state).filter((field) => FIELDS_TO_COMPARE.includes(field as keyof Mission));

      console.log("fields", fields);

      for (const field of fields) {
        changes[field] = {
          previous: initialMission?.[field],
          current: history.state[field],
        };
      }

      console.log("changes", changes);
      if (Object.keys(changes).length > 0) {
        events.push({
          type: "update",
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
  const where = {
    // __history: { $exists: true },
    // _id: "5f96fe4c1b55850008fac57d",
    _id: "6824eafdb31b0edbfe4b51ec",
  };

  const count = await MissionModel.countDocuments(where);
  console.log(`Found ${count} missions with __history`);

  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batch = await MissionModel.find(where).skip(i).limit(BATCH_SIZE).lean();
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(count / BATCH_SIZE)}`);
    for (const mission of batch) {
      const events = transformMissionHistoryToMissionEvent(mission);
      console.log(events);
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
