/**
 * Script qui analyse toutes les campagnes et identifie celles qui n'ont aucun tracker.
 */
import dotenv from "dotenv";
dotenv.config();

import { PUBLISHER_IDS } from "../src/config";
import { pgConnected } from "../src/db/postgres";
import { campaignService } from "../src/services/campaign";
import { CampaignRecord } from "../src/types/campaign";
import { slugify } from "../src/utils/string";

const createCampaignDefaultTrackers = async (campaign: CampaignRecord) => {
  if (campaign.fromPublisherId === PUBLISHER_IDS.SERVICE_CIVIQUE) {
    console.log(`Creating mtm default trackers for campaign ${campaign.name} (${campaign.id})`);
    const trackers = [
      { key: "mtm_source", value: "api_engagement" },
      { key: "mtm_medium", value: "campaign" },
      { key: "mtm_campaign", value: slugify(campaign.name) },
    ];

    return await campaignService.updateCampaign(campaign.id, {
      trackers,
    });
  } else {
    console.log(`Creating utm default trackers for campaign ${campaign.name} (${campaign.id})`);
    const trackers = [
      { key: "utm_source", value: "api_engagement" },
      { key: "utm_medium", value: "campaign" },
      { key: "utm_campaign", value: slugify(campaign.name) },
    ];

    return await campaignService.updateCampaign(campaign.id, {
      trackers,
    });
  }
};

const run = async () => {
  await pgConnected;
  console.log("Creating default trackers for campaigns...");

  let processed = 0;
  let trackersCreated = 0;

  const data = await campaignService.findCampaigns({
    all: true,
    includeTotal: "all",
  });
  console.log(`Found ${data.total} total campaigns`);

  const campaignsWithoutTrackers = data.results.filter((campaign) => !campaign.trackers || campaign.trackers.length === 0);
  console.log(`Found ${campaignsWithoutTrackers.length} campaigns without trackers`);

  for (const campaign of campaignsWithoutTrackers) {
    processed++;
    const result = await createCampaignDefaultTrackers(campaign);
    trackersCreated += result.trackers.length;
  }

  console.log(`Created ${trackersCreated} trackers`);
  console.log(`Processed ${processed} campaigns`);
};

const shutdown = async (exitCode: number) => {
  const { prismaCore, prismaAnalytics } = await import("../src/db/postgres");
  await Promise.allSettled([prismaCore.$disconnect(), prismaAnalytics.$disconnect()]);
  process.exit(exitCode);
};

run()
  .then(async () => {
    console.log("\n[AnalyzeCampaigns] Analysis completed successfully");
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("\n[AnalyzeCampaigns] Failed to analyze campaigns", error);
    await shutdown(1);
  });
