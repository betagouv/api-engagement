import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

import { prismaCore } from "../../src/db/postgres";
import { splitActivityString, isWhitelistedActivity } from "../../src/utils/activity";

const REPORTS_DIR = path.resolve(__dirname, "../../reports");

interface ActivityAnalysis {
  originalName: string;
  missionCount: number;
  splitResult: string[];
  unmappedParts: string[];
  isFullyWhitelisted: boolean;
}

const run = async () => {
  await prismaCore.$connect();
  console.log("[AnalyzeActivities] Connected to PostgreSQL");

  // Load all activities with their mission counts
  const activities = await prismaCore.activity.findMany({
    select: {
      id: true,
      name: true,
      missions: { select: { id: true } },
    },
  });

  console.log(`[AnalyzeActivities] Found ${activities.length} distinct activities`);

  const analyses: ActivityAnalysis[] = [];
  const unmapped: { originalName: string; missionCount: number; splitResult: string[]; unmappedParts: string[] }[] = [];

  for (const activity of activities) {
    const missionCount = activity.missions.length;
    const splitResult = splitActivityString(activity.name);
    const unmappedParts = splitResult.filter((part) => !isWhitelistedActivity(part));
    const isFullyWhitelisted = unmappedParts.length === 0;

    analyses.push({ originalName: activity.name, missionCount, splitResult, unmappedParts, isFullyWhitelisted });

    if (!isFullyWhitelisted) {
      unmapped.push({ originalName: activity.name, missionCount, splitResult, unmappedParts });
    }
  }

  // Sort by mission count descending
  analyses.sort((a, b) => b.missionCount - a.missionCount);
  unmapped.sort((a, b) => b.missionCount - a.missionCount);

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Write full analysis JSON
  fs.writeFileSync(path.join(REPORTS_DIR, "activity-analysis-full.json"), JSON.stringify(analyses, null, 2), "utf-8");
  console.log(`[AnalyzeActivities] Wrote activity-analysis-full.json (${analyses.length} entries)`);

  // Write unmapped JSON
  fs.writeFileSync(path.join(REPORTS_DIR, "activity-unmapped.json"), JSON.stringify(unmapped, null, 2), "utf-8");
  console.log(`[AnalyzeActivities] Wrote activity-unmapped.json (${unmapped.length} entries)`);

  // Write unmapped CSV with "Proposed Mapping" column for manual editing
  const csvHeader = "originalName,missionCount,splitResult,unmappedParts,Proposed Mapping";
  const csvRows = unmapped.map((entry) => {
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    return [
      escapeCsv(entry.originalName),
      String(entry.missionCount),
      escapeCsv(entry.splitResult.join("; ")),
      escapeCsv(entry.unmappedParts.join("; ")),
      "", // Proposed Mapping - to be filled manually
    ].join(",");
  });
  fs.writeFileSync(path.join(REPORTS_DIR, "activity-unmapped.csv"), [csvHeader, ...csvRows].join("\n") + "\n", "utf-8");
  console.log(`[AnalyzeActivities] Wrote activity-unmapped.csv (${unmapped.length} entries needing manual review)`);

  // Summary
  const totalMissions = analyses.reduce((sum, a) => sum + a.missionCount, 0);
  const whitelistedCount = analyses.filter((a) => a.isFullyWhitelisted).length;
  console.log(`[AnalyzeActivities] Summary:`);
  console.log(`  Total activities: ${analyses.length}`);
  console.log(`  Fully whitelisted: ${whitelistedCount}`);
  console.log(`  Needing manual mapping: ${unmapped.length}`);
  console.log(`  Total missions with activities: ${totalMissions}`);
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    console.log("[AnalyzeActivities] Completed successfully");
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[AnalyzeActivities] Failed", error);
    await shutdown(1);
  });
