/**
 * Script the __history field of the mission collection and to migrate it to the mission-event collection
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import "../src/db/mongo";
import prisma from "../src/db/postgres";

import MissionModel from "../src/models/mission";
import MissionEventModel from "../src/models/mission-event";

import mongoose, { Schema } from "mongoose";
import { Mission, MissionEvent } from "../src/types";
import { IMPORT_FIELDS_TO_COMPARE } from "../src/utils/mission";

const FIELDS = [
  ...IMPORT_FIELDS_TO_COMPARE,
  "deletedAt",
  "leboncoinStatus",
  "leboncoinUrl",
  "leboncoinComment",
  "leboncoinUpdatedAt",
  "jobteaserStatus",
  "jobteaserUrl",
  "jobteaserComment",
  "jobteaserUpdatedAt",
  "letudiantPublicId",
  "letudiantUpdatedAt",
  "letudiantError",
];

const transformMissionHistoryToMissionEvent = (mission: Mission) => {
  const events: Omit<MissionEvent, "_id">[] = [];

  if (!mission.__history || !mission._id) {
    return events;
  }

  let initialMission = {} as Mission;

  const createHistory = mission.__history.find((h) => h.metadata?.action === "created");
  if (createHistory) {
    events.push({
      type: "create",
      changes: null,
      fields: [] as string[],
      createdAt: createHistory.date,
      missionId: mission._id,
      lastExportedToPgAt: null,
    });
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
          previous: initialMission[field] === undefined ? "unknown" : initialMission[field],
          current: history.state[field] === undefined ? null : history.state[field],
        };

        initialMission[field] = history.state[field];
      }

      if (Object.keys(changes).length > 0) {
        events.push({
          type: changes.deletedAt ? "delete" : "update",
          changes,
          fields,
          createdAt: history.date,
          missionId: mission._id,
          lastExportedToPgAt: null,
        });
      }

      continue;
    }
  }

  return events;
};

const BATCH_SIZE = 10000;

const main = async () => {
  const res = await prisma.missionHistoryEvent.deleteMany({});
  console.log(res);
  // return;

  const res1 = await MissionEventModel.updateMany({}, { lastExportedToPgAt: null });
  // const res = await MissionEventModel.deleteMany({});
  console.log(res1);
  return;

  const where = {
    __history: { $exists: true },
  };

  const count = await MissionModel.countDocuments(where);
  console.log(`Found ${count} missions with __history`);

  let events: Omit<MissionEvent, "_id">[] = [];
  let created = 0;
  const ids = [] as Schema.Types.ObjectId[];
  let batchCount = 0;

  while (true) {
    const batch = await MissionModel.find(where).limit(BATCH_SIZE).lean();
    if (batch.length === 0) {
      break;
    }

    console.log(`Processing batch ${batchCount + 1} of ${Math.ceil(count / BATCH_SIZE)}, ${created} events created`);

    for (const mission of batch) {
      events.push(...transformMissionHistoryToMissionEvent(mission));
      if (events.length > 1000) {
        console.log("Inserting events", events.length);

        await MissionEventModel.insertMany(events);
        created += events.length;
        events = [];
      }
      ids.push(mission._id);
    }
    console.log("Inserting events", events.length);

    await MissionEventModel.insertMany(events);
    created += events.length;
    events = [];

    console.log("Unsetting __history", ids.length);
    // const res = await MissionModel.updateMany({ _id: { $in: ids } }, { $unset: { __history: 1 } });
    await mongoose.connection.db.collection("missions").updateMany({ _id: { $in: ids } }, { $unset: { __history: 1 } });
    ids.length = 0;
    batchCount++;
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
