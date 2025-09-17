-- DropForeignKey
ALTER TABLE "CampaignTracker" DROP CONSTRAINT "CampaignTracker_campaign_id_fkey";

-- AddForeignKey
ALTER TABLE "CampaignTracker" ADD CONSTRAINT "CampaignTracker_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
