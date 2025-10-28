import dotenv from "dotenv";
import path from "path";

// Minimal early parse to detect --env <name> before importing modules that use env vars
function getEnvFromArgs(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env" && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return undefined;
}

const envName = getEnvFromArgs();
if (envName) {
  const envPath = path.join(__dirname, `../.env.${envName}`);
  console.log(`[Script] Loading env file: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

import { LETUDIANT_PILOTY_TOKEN } from "../src/config";
import { MEDIA_PUBLIC_ID } from "../src/jobs/letudiant/config";
import { rateLimit } from "../src/jobs/letudiant/utils";
import { PilotyClient } from "../src/services/piloty";

async function main() {
  if (!LETUDIANT_PILOTY_TOKEN) {
    console.error("LETUDIANT_PILOTY_TOKEN is not set in environment variables");
    process.exit(1);
  }

  // Default list of public IDs (can be edited manually if you prefer)
  const ids: string[] = ["je-participe-a-la-promotion-d-un-festival-evenement-arengosse-france-20"];

  if (!ids.length) {
    console.error("No public IDs provided. Use --ids=a,b,c or edit defaultIds array in the script.");
    process.exit(1);
  }

  const client = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);

  let success = 0;
  let failed = 0;

  console.log(`[archive-piloty-jobs] Archiving ${ids.length} job(s) on Piloty...`);

  for (const publicId of ids) {
    try {
      console.log(`→ PATCH job ${publicId} with state=archived`);
      // Piloty accepts partial payload on PATCH; our TS type is stricter so we cast.
      await client.updateJob(publicId, { media_public_id: MEDIA_PUBLIC_ID, state: "archived" } as any);
      success++;
    } catch (err) {
      failed++;
      console.error(`✗ Failed to archive ${publicId}:`, err);
    }
    // simple rate limit to avoid hitting API limits
    await rateLimit();
  }

  console.log(`[archive-piloty-jobs] Done. Success: ${success}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
