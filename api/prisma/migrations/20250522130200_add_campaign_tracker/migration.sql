-- CreateTable
CREATE TABLE "CampaignTracker" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CampaignTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_tracker_campaign_id" ON "CampaignTracker"("campaign_id");

-- AddForeignKey
ALTER TABLE "CampaignTracker" ADD CONSTRAINT "CampaignTracker_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
