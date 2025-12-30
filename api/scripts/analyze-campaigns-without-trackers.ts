/**
 * Script qui analyse toutes les campagnes et identifie celles qui n'ont aucun tracker.
 */
import dotenv from "dotenv";
dotenv.config();

import { pgConnected } from "../src/db/postgres";
import { campaignService } from "../src/services/campaign";
import { CampaignRecord } from "../src/types/campaign";

const run = async () => {
  await pgConnected;
  console.log("[AnalyzeCampaigns] Connected to PostgreSQL");

  console.log("[AnalyzeCampaigns] Fetching all campaigns...");

  // Récupérer toutes les campagnes avec pagination (y compris celles supprimées pour l'analyse complète)
  const LIMIT = 100; // Limite maximale du service
  let offset = 0;
  let allCampaigns: CampaignRecord[] = [];
  let total = 0;

  while (true) {
    const result = await campaignService.findCampaigns({
      all: true,
      limit: LIMIT,
      offset,
      includeTotal: offset === 0 ? "all" : "none", // Récupérer le total seulement au premier appel
    });

    if (offset === 0) {
      total = result.total;
      console.log(`[AnalyzeCampaigns] Found ${total} total campaigns`);
    }

    allCampaigns = allCampaigns.concat(result.results);
    offset += LIMIT;

    if (result.results.length < LIMIT) {
      break; // Dernière page
    }

    console.log(`[AnalyzeCampaigns] Fetched ${allCampaigns.length}/${total} campaigns...`);
  }

  console.log(`[AnalyzeCampaigns] Analyzing ${allCampaigns.length} campaigns...`);

  // Filtrer les campagnes sans trackers
  const campaignsWithoutTrackers = allCampaigns.filter((campaign) => !campaign.trackers || campaign.trackers.length === 0);

  console.log(`\n[AnalyzeCampaigns] Found ${campaignsWithoutTrackers.length} campaigns without trackers`);

  if (campaignsWithoutTrackers.length > 0) {
    console.log("\n[AnalyzeCampaigns] Campaigns without trackers:");
    console.log("=".repeat(80));

    campaignsWithoutTrackers.forEach((campaign, index) => {
      console.log(`\n${index + 1}. ${campaign.name} (ID: ${campaign.id})`);
      console.log(`   Type: ${campaign.type}`);
      console.log(`   URL: ${campaign.url}`);
      console.log(`   From Publisher: ${campaign.fromPublisherName} (${campaign.fromPublisherId})`);
      console.log(`   To Publisher: ${campaign.toPublisherName} (${campaign.toPublisherId})`);
      console.log(`   Active: ${campaign.active}`);
      console.log(`   Deleted: ${campaign.deletedAt ? campaign.deletedAt.toISOString() : "No"}`);
      console.log(`   Created: ${campaign.createdAt.toISOString()}`);
    });

    console.log("\n" + "=".repeat(80));
  }

  // Statistiques supplémentaires
  const activeWithoutTrackers = campaignsWithoutTrackers.filter((c) => c.active && !c.deletedAt);
  const deletedWithoutTrackers = campaignsWithoutTrackers.filter((c) => c.deletedAt);

  console.log(`\n[AnalyzeCampaigns] Statistics:`);
  console.log(`  - Active campaigns without trackers: ${activeWithoutTrackers.length}`);
  console.log(`  - Deleted campaigns without trackers: ${deletedWithoutTrackers.length}`);
  console.log(`  - Total campaigns with trackers: ${total - campaignsWithoutTrackers.length}`);
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
