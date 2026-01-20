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

/**
 * Décode les valeurs URL-encodées dans les trackers.
 * Ex: "La+tourn%C3%A9e+d%27%C3%A9t%C3%A9" -> "La+tournée+d'été"
 */
const decodeTrackerValue = (value: string): string => {
  try {
    // Special case for >
    if (value === "%3E") {
      return ">=|1";
    }
    return decodeURIComponent(value).replace(/\'/g, "%27");
  } catch {
    // Si le décodage échoue, retourner la valeur originale
    return value;
  }
};

const cleanCampaignTrackers = async (campaign: CampaignRecord) => {
  const cleanedTrackers = campaign.trackers.map((tracker) => ({
    key: tracker.key,
    value: decodeTrackerValue(tracker.value),
  }));

  // Vérifier si au moins un tracker a été modifié
  const hasChanges = campaign.trackers.some((tracker, index) => tracker.value !== cleanedTrackers[index].value);

  if (!hasChanges) {
    return null;
  }

  console.log(`Cleaning trackers for campaign ${campaign.name} (${campaign.id})`);
  campaign.trackers.forEach((tracker, index) => {
    if (tracker.value !== cleanedTrackers[index].value) {
      console.log(`  ${tracker.key}: "${tracker.value}" -> "${cleanedTrackers[index].value}"`);
    }
  });

  // return await campaignService.updateCampaign(campaign.id, {
  //   trackers: cleanedTrackers,
  // });
};

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
  let trackersUpdated = 0;

  let offset = 0;

  while (true) {
    const data = await campaignService.findCampaigns({
      all: true,
      limit: 100,
      offset,
    });
    // console.log(`Found ${data.results.length} total campaigns`);
    if (data.results.length === 0) {
      break;
    }

    // const campaignsWithoutTrackers = data.results.filter((campaign) => !campaign.trackers || campaign.trackers.length === 0);
    // console.log(`Found ${campaignsWithoutTrackers.length} campaigns without trackers`);

    // for (const campaign of campaignsWithoutTrackers) {
    //   processed++;
    //   const result = await createCampaignDefaultTrackers(campaign);
    //   trackersCreated += result.trackers.length;
    // }

    // Update trackers without special characters (decode URL-encoded values)
    const campaignsWithTrackers = data.results.filter((campaign) => campaign.trackers && campaign.trackers.length > 0);
    // console.log(`\nChecking ${campaignsWithTrackers.length} campaigns with trackers for URL-encoded values...`);

    for (const campaign of campaignsWithTrackers) {
      const result = await cleanCampaignTrackers(campaign);
      if (result) {
        trackersUpdated++;
      }
    }
    offset += 100;
  }

  console.log(`\nCreated ${trackersCreated} trackers`);
  console.log(`Updated ${trackersUpdated} campaigns with cleaned trackers`);
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
