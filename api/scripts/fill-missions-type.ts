import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

import { mongoConnected } from "../src/db/mongo";
import { prismaCore } from "../src/db/postgres";
import MissionModel from "../src/models/mission";
import { MissionType as MongoMissionType } from "../src/types";

const DRY_RUN = process.argv.includes("--dry-run");

const MISSING_TYPE_FILTER = {
  $or: [{ type: { $exists: false } }, { type: null }, { type: "" }, { type: "volontariat" }],
};

const MISSING_PUBLISHER_FILTER = {
  $or: [{ publisherId: { $exists: false } }, { publisherId: null }, { publisherId: "" }],
};

type PublisherMissionType = "benevolat" | "volontariat_service_civique" | null | undefined;

const resolveMissionTypeFromPublisher = (publisherMissionType: PublisherMissionType): MongoMissionType => {
  if (publisherMissionType === "volontariat_service_civique") {
    return MongoMissionType.VOLONTARIAT;
  }
  return MongoMissionType.BENEVOLAT;
};

const buildFilter = (publisherId?: string | null) => {
  const clauses: Record<string, unknown>[] = [MISSING_TYPE_FILTER];
  if (!publisherId) {
    clauses.push(MISSING_PUBLISHER_FILTER);
  } else {
    clauses.push({ publisherId });
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { $and: clauses };
};

const run = async () => {
  await Promise.all([mongoConnected, prismaCore.$connect()]);
  console.log("[MissionTypeBackfill] Connected to MongoDB and PostgreSQL");

  const totalMissionsToProcess = await MissionModel.countDocuments(MISSING_TYPE_FILTER);
  console.log(`[MissionTypeBackfill] ${totalMissionsToProcess} missions without type detected`);
  if (!totalMissionsToProcess) {
    return;
  }

  const publishers = await prismaCore.publisher.findMany({
    select: { id: true, missionType: true },
  });

  const publisherMissionTypeMap = new Map<string, PublisherMissionType>();
  for (const publisher of publishers) {
    publisherMissionTypeMap.set(publisher.id, publisher.missionType);
  }

  console.log(`[MissionTypeBackfill] Loaded mission type for ${publisherMissionTypeMap.size} publishers`);
  if (DRY_RUN) {
    console.log("[MissionTypeBackfill] Running in dry run mode - no data will be written");
  }

  const publishersWithMissingType = await MissionModel.distinct("publisherId", MISSING_TYPE_FILTER);

  let updated = 0;
  let publishersWithoutMissionType = 0;
  let processedPublishers = 0;
  let hasPublisherLessMissions = false;

  const distinctPublishers: string[] = [];
  for (const publisherId of publishersWithMissingType) {
    if (!publisherId) {
      hasPublisherLessMissions = true;
      continue;
    }
    distinctPublishers.push(publisherId);
  }

  const updateForPublisher = async (publisherId?: string | null) => {
    const publisherMissionType = publisherId ? publisherMissionTypeMap.get(publisherId) : null;
    if (publisherId && !publisherMissionType) {
      publishersWithoutMissionType++;
    }

    const typeToSet = resolveMissionTypeFromPublisher(publisherMissionType);
    const filter = buildFilter(publisherId);

    if (DRY_RUN) {
      const count = await MissionModel.countDocuments(filter);
      updated += count;
      console.log(
        `[MissionTypeBackfill] [DryRun] Publisher ${publisherId ?? "<none>"} -> ${typeToSet}: ${count} missions would be updated (processed publishers: ${processedPublishers + 1})`
      );
      return;
    }

    const now = new Date();
    const result = await MissionModel.updateMany(filter, {
      $set: {
        type: typeToSet,
        updatedAt: now,
      },
    });
    updated += result.modifiedCount ?? 0;
    console.log(
      `[MissionTypeBackfill] Publisher ${publisherId ?? "<none>"} -> ${typeToSet}: ${result.modifiedCount ?? 0} missions updated (processed publishers: ${processedPublishers + 1})`
    );
  };

  for (const publisherId of distinctPublishers) {
    await updateForPublisher(publisherId);
    processedPublishers++;
  }

  if (hasPublisherLessMissions) {
    await updateForPublisher(null);
    processedPublishers++;
  }

  console.log(`[MissionTypeBackfill] Processed ${processedPublishers} publishers with missing type missions`);
  console.log(`[MissionTypeBackfill] Updated ${updated} missions`);
  console.log(`[MissionTypeBackfill] Publishers without mission type configured: ${publishersWithoutMissionType}`);
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    console.log("[MissionTypeBackfill] Completed successfully");
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[MissionTypeBackfill] Failed to backfill mission types", error);
    await shutdown(1);
  });
