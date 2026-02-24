import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "@/db/postgres";
import { MissionType } from "@/db/core";

const DRY_RUN = process.argv.includes("--dry-run");

const missingTypeWhere = {
  OR: [{ type: null }, { type: "" }, { type: "null" }, { type: "volontariat-service-civique" }],
} as const;

type PublisherMissionType = "benevolat" | "volontariat_service_civique" | null | undefined;

const resolveMissionTypeFromPublisher = (publisherMissionType: PublisherMissionType): MissionType => {
  if (publisherMissionType === "volontariat_service_civique") {
    return "volontariat_service_civique";
  }
  return "benevolat";
};

const run = async () => {
  await prismaCore.$connect();
  console.log("[MissionTypeBackfill] Connected to PostgreSQL");

  const totalMissionsToProcess = await prismaCore.mission.count({ where: missingTypeWhere });
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

  const publishersWithMissingType = await prismaCore.mission.findMany({
    where: missingTypeWhere,
    select: { publisherId: true },
    distinct: ["publisherId"],
  });

  let updated = 0;
  let publishersWithoutMissionType = 0;
  let processedPublishers = 0;
  const distinctPublishers: string[] = publishersWithMissingType.map((m) => m.publisherId).filter(Boolean) as string[];

  const updateForPublisher = async (publisherId?: string | null) => {
    const publisherMissionType = publisherId ? publisherMissionTypeMap.get(publisherId) : null;
    if (publisherId && !publisherMissionType) {
      publishersWithoutMissionType++;
    }

    const typeToSet = resolveMissionTypeFromPublisher(publisherMissionType);
    const filter = { ...missingTypeWhere, ...(publisherId ? { publisherId } : {}) };

    if (DRY_RUN) {
      const count = await prismaCore.mission.count({ where: filter });
      updated += count;
      console.log(
        `[MissionTypeBackfill] [DryRun] Publisher ${publisherId ?? "<none>"} -> ${typeToSet}: ${count} missions would be updated (processed publishers: ${processedPublishers + 1})`
      );
      return;
    }

    const result = await prismaCore.mission.updateMany({
      where: filter,
      data: {
        type: typeToSet,
      },
    });
    updated += result.count ?? 0;
    console.log(
      `[MissionTypeBackfill] Publisher ${publisherId ?? "<none>"} -> ${typeToSet}: ${result.count ?? 0} missions updated (processed publishers: ${processedPublishers + 1})`
    );
  };

  for (const publisherId of distinctPublishers) {
    await updateForPublisher(publisherId);
    processedPublishers++;
  }

  console.log(`[MissionTypeBackfill] Processed ${processedPublishers} publishers with missing type missions`);
  console.log(`[MissionTypeBackfill] Updated ${updated} missions`);
  console.log(`[MissionTypeBackfill] Publishers without mission type configured: ${publishersWithoutMissionType}`);
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
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
