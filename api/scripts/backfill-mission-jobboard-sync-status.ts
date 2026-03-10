import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";

const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
  await prisma.$connect();
  console.log("[MissionJobBoardSyncStatusBackfill] Connected to PostgreSQL");

  if (DRY_RUN) {
    console.log("[MissionJobBoardSyncStatusBackfill] Running in dry run mode - no data will be written");
  }

  const editedCount = await prisma.missionJobBoard.count({ where: { status: "EDITED", syncStatus: null } });
  const archivedCount = await prisma.missionJobBoard.count({ where: { status: "ARCHIVED", syncStatus: null } });
  const acceptedCount = await prisma.missionJobBoard.count({ where: { status: "ACCEPTED", syncStatus: null } });
  const deletedCount = await prisma.missionJobBoard.count({ where: { status: "DELETED", syncStatus: null } });
  const nullStatusCount = await prisma.missionJobBoard.count({ where: { status: null, syncStatus: null } });
  const nullStatusWithCommentCount = await prisma.missionJobBoard.count({ where: { status: null, syncStatus: null, comment: { not: null } } });

  console.log(`[MissionJobBoardSyncStatusBackfill] EDITED -> ONLINE candidates: ${editedCount}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] ARCHIVED -> OFFLINE candidates: ${archivedCount}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] ACCEPTED -> ONLINE candidates: ${acceptedCount}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] DELETED -> OFFLINE candidates: ${deletedCount}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] NULL -> ONLINE candidates: ${nullStatusCount}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] NULL + comment -> ERROR candidates: ${nullStatusWithCommentCount}`);

  if (DRY_RUN) {
    return;
  }

  const editedResult = await prisma.missionJobBoard.updateMany({
    where: { status: "EDITED", syncStatus: null },
    data: { syncStatus: "ONLINE" },
  });

  const archivedResult = await prisma.missionJobBoard.updateMany({
    where: { status: "ARCHIVED", syncStatus: null },
    data: { syncStatus: "OFFLINE" },
  });

  const acceptedResult = await prisma.missionJobBoard.updateMany({
    where: { status: "ACCEPTED", syncStatus: null },
    data: { syncStatus: "ONLINE" },
  });

  const deletedResult = await prisma.missionJobBoard.updateMany({
    where: { status: "DELETED", syncStatus: null },
    data: { syncStatus: "OFFLINE" },
  });

  const nullStatusResult = await prisma.missionJobBoard.updateMany({
    where: { status: null, syncStatus: null, comment: null },
    data: { syncStatus: "ONLINE" },
  });

  const nullStatusWithCommentResult = await prisma.missionJobBoard.updateMany({
    where: { status: null, syncStatus: null, comment: { not: null } },
    data: { syncStatus: "ERROR" },
  });

  console.log(`[MissionJobBoardSyncStatusBackfill] EDITED -> ONLINE updated: ${editedResult.count ?? 0}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] ARCHIVED -> OFFLINE updated: ${archivedResult.count ?? 0}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] ACCEPTED -> ONLINE updated: ${acceptedResult.count ?? 0}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] DELETED -> OFFLINE updated: ${deletedResult.count ?? 0}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] NULL -> ONLINE updated: ${nullStatusResult.count ?? 0}`);
  console.log(`[MissionJobBoardSyncStatusBackfill] NULL + comment -> ERROR updated: ${nullStatusWithCommentResult.count ?? 0}`);
};

const shutdown = async (exitCode: number) => {
  await prisma.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    console.log("[MissionJobBoardSyncStatusBackfill] Completed successfully");
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[MissionJobBoardSyncStatusBackfill] Failed to backfill sync status", error);
    await shutdown(1);
  });
