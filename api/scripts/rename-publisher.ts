import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import { mongoConnected } from "../src/db/mongo";
import { pgConnected, prismaCore } from "../src/db/postgres";
import MissionModel from "../src/models/mission";
import { publisherService } from "../src/services/publisher";

interface RenamePublisherOptions {
  dryRun: boolean;
}

interface RenamePublisherResult {
  publishers: { matched: number; updated: number };
  missions: { matched: number; updated: number };
  statEvents: { fromPublisher: number; toPublisher: number };
  dryRun: boolean;
}

const USAGE = `Usage: ts-node scripts/rename-publisher.ts <oldName> <newName> [--dry-run]`;

type StatEventColumn = "from_publisher_name" | "to_publisher_name";
type StatField = "fromPublisherName" | "toPublisherName";

const parseArgs = (): { oldName: string; newName: string; options: RenamePublisherOptions } => {
  const args = process.argv.slice(2);
  const options: RenamePublisherOptions = { dryRun: false };

  const dryRunIndex = args.indexOf("--dry-run");
  if (dryRunIndex !== -1) {
    options.dryRun = true;
    args.splice(dryRunIndex, 1);
  }

  if (args.length !== 2) {
    throw new Error(USAGE);
  }

  const [oldName, newName] = args;
  if (!oldName || !newName) {
    throw new Error(USAGE);
  }

  if (oldName === newName) {
    throw new Error("'oldName' and 'newName' must be different");
  }

  return { oldName, newName, options };
};

const updateStatEventsColumn = async (column: StatEventColumn, oldName: string, newName: string, dryRun: boolean): Promise<number> => {
  if (dryRun) {
    const count = await prismaCore.statEvent.count({ where: { [column]: oldName } });
    console.log(`[RenamePublisher][Dry-run] Would update ${count} StatEvent row(s) in column ${column}`);
    return count;
  }

  const { count } = await prismaCore.statEvent.updateMany({ where: { [column]: oldName }, data: { [column]: newName } });
  console.log(`[RenamePublisher] Updated ${count} StatEvent row(s) in column ${column}`);
  return count;
};

const renamePublisher = async (oldName: string, newName: string, { dryRun }: RenamePublisherOptions): Promise<RenamePublisherResult> => {
  console.log(`[RenamePublisher] Starting${dryRun ? " (dry-run)" : ""}`);
  console.log(`[RenamePublisher] Renaming '${oldName}' -> '${newName}'`);

  const missionFilter = { publisherName: oldName };
  const existingPublisher = await publisherService.findOnePublisherByName(oldName);
  const publishersMatched = existingPublisher ? 1 : 0;
  const missionsMatched = await MissionModel.countDocuments(missionFilter);

  let publishersUpdated = 0;
  let missionsUpdated = 0;

  if (!dryRun) {
    if (existingPublisher) {
      await publisherService.updatePublisher(existingPublisher.id, { name: newName });
      publishersUpdated = 1;
      console.log(`[RenamePublisher] Updated publisher '${existingPublisher.name}' to '${newName}'`);
    } else {
      console.log(`[RenamePublisher] No publisher found with name '${oldName}'`);
    }

    const missionUpdateResult = await MissionModel.updateMany(missionFilter, { $set: { publisherName: newName } });
    missionsUpdated = missionUpdateResult.modifiedCount ?? 0;
    console.log(`[RenamePublisher] Updated ${missionsUpdated} mission document(s)`);
  } else {
    console.log(`[RenamePublisher][Dry-run] Would update ${publishersMatched} publisher document(s)`);
    console.log(`[RenamePublisher][Dry-run] Would update ${missionsMatched} mission document(s)`);
  }

  const statEventsFromResult = await updateStatEventsColumn("from_publisher_name", oldName, newName, dryRun);
  const statEventsToResult = await updateStatEventsColumn("to_publisher_name", oldName, newName, dryRun);

  const result: RenamePublisherResult = {
    publishers: { matched: publishersMatched, updated: dryRun ? publishersMatched : publishersUpdated },
    missions: { matched: missionsMatched, updated: dryRun ? missionsMatched : missionsUpdated },
    statEvents: {
      fromPublisher: statEventsFromResult,
      toPublisher: statEventsToResult,
    },
    dryRun,
  };

  console.log(`[RenamePublisher] Completed with result:`, JSON.stringify(result, null, 2));

  return result;
};

const cleanup = async () => {
  const cleanupPromises: Array<Promise<unknown>> = [prismaCore.$disconnect(), mongoose.connection.close()];

  await Promise.allSettled(cleanupPromises);
};

const main = async () => {
  const { oldName, newName, options } = parseArgs();

  await Promise.all([mongoConnected, pgConnected]);

  try {
    await renamePublisher(oldName, newName, options);
  } finally {
    await cleanup();
  }
};

main().catch((error) => {
  console.error("[RenamePublisher] Error:", error.message ?? error);
  cleanup().finally(() => process.exit(1));
});
