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
import { mongoConnected } from "../src/db/mongo";
import { MEDIA_PUBLIC_ID } from "../src/jobs/letudiant/config";
import { rateLimit } from "../src/jobs/letudiant/utils";
import MissionModel from "../src/models/mission";
import OrganizationModel from "../src/models/organization";
import { PilotyClient } from "../src/services/piloty/client";
import { PilotyCompanyPayload } from "../src/services/piloty/types";

// const DEFAULT_LOGO_URL = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/jva-logo.png";
const DEFAULT_LOGO_URL = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/asc-logo.png";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: { limit?: number; dryRun?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--limit" && i + 1 < args.length) {
      const n = Number(args[i + 1]);
      if (!Number.isNaN(n)) {
        opts.limit = n;
      }
      i++;
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    }
  }
  return opts;
}

async function main() {
  const { limit, dryRun } = parseArgs();

  console.log(`[Script] Waiting for MongoDB connection...`);
  await mongoConnected;
  console.log(`[Script] MongoDB connected.`);

  if (!LETUDIANT_PILOTY_TOKEN) {
    throw new Error("LETUDIANT_PILOTY_TOKEN is not set in environment");
  }

  const pilotyClient = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);

  // 1) Find missions sent to Piloty with the default logo URL
  console.log(`[Script] Searching missions with default organizationLogo and sent to Piloty...`);
  const missionQuery: any = {
    organizationLogo: DEFAULT_LOGO_URL,
    // $or: [{ organizationLogo: { $exists: false } }, { organizationLogo: null }, { organizationLogo: "" }],
    letudiantPublicId: { $exists: true, $ne: null },
    organizationId: {
      $exists: true,
      $ne: null,
      $regex: /^[0-9a-fA-F]{24}$/,
    },
  };

  const projection = { organizationId: 1 };
  const missions = await MissionModel.find(missionQuery, projection).limit(limit || 0);
  console.log(`[Script] Found ${missions.length} missions matching criteria.`);

  // 2) Deduplicate by organizationId
  const organizationIds = Array.from(new Set(missions.map((m) => m.organizationId).filter(Boolean)));
  console.log(`[Script] ${organizationIds.length} unique organizations to process.`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const orgId of organizationIds) {
    try {
      const organization = await OrganizationModel.findById(orgId);
      if (!organization) {
        console.warn(`[Script] Organization ${orgId} not found. Skipping.`);
        skipped++;
        continue;
      }

      const companyPublicId = (organization as any).letudiantPublicId as string | undefined;
      if (!companyPublicId) {
        console.warn(`[Script] Organization ${organization.title} (${orgId}) has no letudiantPublicId. Skipping.`);
        skipped++;
        continue;
      }

      const payload: PilotyCompanyPayload = {
        media_public_id: MEDIA_PUBLIC_ID,
        name: organization.title,
        logo_url: DEFAULT_LOGO_URL,
      };

      if (dryRun) {
        console.log(`[DRY RUN] Would update company ${organization.title} (${companyPublicId}) with logo_url=${payload.logo_url}`);
      } else {
        console.log(`[Script] Updating company ${organization.title} (${companyPublicId})...`);
        const res = await pilotyClient.updateCompany(companyPublicId, payload);
        // If Piloty returns null, it means no changes were applied (same logo already)
        if (res) {
          updated++;
        } else {
          console.log(`[Script] No change returned by Piloty for ${organization.title} (${companyPublicId}).`);
        }
        await rateLimit();
      }

      processed++;
    } catch (e: any) {
      console.error(`[Script] Error processing organization ${orgId}:`, e?.message || e);
      errors++;
    }
  }

  console.log(`[Script] Done.`);
  console.log(`\nSummary:`);
  console.log(`  Organizations processed: ${processed}`);
  console.log(`  Companies updated:       ${updated}`);
  console.log(`  Skipped:                 ${skipped}`);
  console.log(`  Errors:                  ${errors}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(`[Script] Fatal error:`, err);
  process.exit(1);
});
