import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

import { isWhitelistedActivity, splitActivityString } from "../../src/utils/activity";

const REPORTS_DIR = path.resolve(__dirname, "../../reports");
const CSV_PATH = path.join(REPORTS_DIR, "activity-unmapped.csv");
const OUTPUT_PATH = path.join(REPORTS_DIR, "activity-mappings.json");

interface ActivityMapping {
  originalName: string;
  mappedTo: string[];
}

/**
 * Parses a CSV row respecting quoted fields (handles commas and escaped quotes inside quotes).
 */
const parseCsvRow = (line: string): string[] => {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
};

const run = async () => {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[ApplyMappings] CSV file not found at ${CSV_PATH}`);
    console.error("[ApplyMappings] Run analyze-activities.ts first to generate the report");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = csvContent.trim().split("\n");

  if (lines.length < 2) {
    console.log("[ApplyMappings] No unmapped activities found in CSV. Nothing to do.");
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify([], null, 2), "utf-8");
    process.exit(0);
  }

  // Skip header (index 0)
  const mappings: ActivityMapping[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvRow(lines[i]);
    // Fields: originalName, missionCount, splitResult, unmappedParts, Proposed Mapping
    const originalName = fields[0]?.trim();
    const proposedMapping = fields[4]?.trim();

    if (!originalName) continue;

    if (!proposedMapping) {
      errors.push(`Line ${i + 1}: "${originalName}" has no Proposed Mapping. Please fill in the CSV.`);
      continue;
    }

    // Parse proposed mapping as comma-separated, respecting compound activities
    const mappedTo = splitActivityString(proposedMapping);

    // Validate each mapped activity is whitelisted
    const invalidMappings = mappedTo.filter((name) => !isWhitelistedActivity(name));
    if (invalidMappings.length) {
      errors.push(`Line ${i + 1}: "${originalName}" maps to non-whitelisted activities: ${invalidMappings.join(", ")}`);
      continue;
    }

    if (!mappedTo.length) {
      errors.push(`Line ${i + 1}: "${originalName}" has empty Proposed Mapping after parsing.`);
      continue;
    }

    mappings.push({ originalName, mappedTo });
  }

  if (errors.length) {
    console.error("[ApplyMappings] Validation errors:");
    errors.forEach((e) => console.error(`  ${e}`));
    console.error("[ApplyMappings] Fix the CSV and re-run.");
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mappings, null, 2), "utf-8");
  console.log(`[ApplyMappings] Validated and saved ${mappings.length} mappings to activity-mappings.json`);
  mappings.forEach((m) => console.log(`  "${m.originalName}" → [${m.mappedTo.join(", ")}]`));
};

run().catch((error) => {
  console.error("[ApplyMappings] Failed", error);
  process.exit(1);
});
