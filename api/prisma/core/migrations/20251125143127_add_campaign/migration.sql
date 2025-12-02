-- CreateEnum
CREATE TYPE "public"."CampaignType" AS ENUM ('AD_BANNER', 'MAILING', 'TILE_BUTTON', 'OTHER');

-- CreateTable
CREATE TABLE "public"."campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CampaignType" NOT NULL,
    "url" TEXT NOT NULL,
    "from_publisher_id" TEXT NOT NULL,
    "to_publisher_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "reassigned_at" TIMESTAMP(3),
    "reassigned_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_tracker" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_tracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_from_publisher_id_idx" ON "public"."campaign"("from_publisher_id");

-- CreateIndex
CREATE INDEX "campaign_to_publisher_id_idx" ON "public"."campaign"("to_publisher_id");

-- CreateIndex
CREATE INDEX "campaign_deleted_at_idx" ON "public"."campaign"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_name_from_publisher_unique_key" ON "public"."campaign"("name", "from_publisher_id");

-- CreateIndex
CREATE INDEX "campaign_tracker_campaign_id_idx" ON "public"."campaign_tracker"("campaign_id");

-- AddForeignKey
ALTER TABLE "public"."campaign" ADD CONSTRAINT "campaign_from_publisher_id_fkey" FOREIGN KEY ("from_publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign" ADD CONSTRAINT "campaign_to_publisher_id_fkey" FOREIGN KEY ("to_publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign" ADD CONSTRAINT "campaign_reassigned_by_user_id_fkey" FOREIGN KEY ("reassigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_tracker" ADD CONSTRAINT "campaign_tracker_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
