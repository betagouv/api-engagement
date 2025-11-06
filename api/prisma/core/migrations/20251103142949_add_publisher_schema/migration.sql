-- CreateEnum
CREATE TYPE "public"."MissionType" AS ENUM ('benevolat', 'volontariat_service_civique');

-- CreateTable
CREATE TABLE "public"."publisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "url" TEXT,
    "moderator" BOOLEAN NOT NULL DEFAULT false,
    "moderator_link" TEXT,
    "email" TEXT,
    "documentation" TEXT,
    "logo" TEXT,
    "default_mission_logo" TEXT,
    "lead" TEXT,
    "feed" TEXT,
    "feed_username" TEXT,
    "feed_password" TEXT,
    "apikey" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "mission_type" "public"."MissionType",
    "is_annonceur" BOOLEAN NOT NULL DEFAULT false,
    "has_api_rights" BOOLEAN NOT NULL DEFAULT false,
    "has_widget_rights" BOOLEAN NOT NULL DEFAULT false,
    "has_campaign_rights" BOOLEAN NOT NULL DEFAULT false,
    "send_report" BOOLEAN NOT NULL DEFAULT false,
    "send_report_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."publisher_diffusion" (
    "id" TEXT NOT NULL,
    "diffuseur_publisher_id" TEXT NOT NULL,
    "annonceur_publisher_id" TEXT NOT NULL,
    "moderator" BOOLEAN NOT NULL DEFAULT false,
    "mission_type" "public"."MissionType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_diffusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publisher_name_idx" ON "public"."publisher"("name");

-- CreateIndex
CREATE INDEX "publisher_apikey_idx" ON "public"."publisher"("apikey");

-- CreateIndex
CREATE INDEX "publisher_mission_type_idx" ON "public"."publisher"("mission_type");

-- CreateIndex
CREATE INDEX "publisher_deleted_at_idx" ON "public"."publisher"("deleted_at");

-- CreateIndex
CREATE INDEX "publisher_is_annonceur_idx" ON "public"."publisher"("is_annonceur");

-- CreateIndex
CREATE INDEX "publisher_has_api_rights_idx" ON "public"."publisher"("has_api_rights");

-- CreateIndex
CREATE INDEX "publisher_has_widget_rights_idx" ON "public"."publisher"("has_widget_rights");

-- CreateIndex
CREATE INDEX "publisher_has_campaign_rights_idx" ON "public"."publisher"("has_campaign_rights");

-- CreateIndex
CREATE INDEX "publisher_send_report_idx" ON "public"."publisher"("send_report");

-- CreateIndex
CREATE INDEX "publisher_diffusion_diffuseur_id_idx" ON "public"."publisher_diffusion"("diffuseur_publisher_id");

-- CreateIndex
CREATE INDEX "publisher_diffusion_annonceur_id_idx" ON "public"."publisher_diffusion"("annonceur_publisher_id");

-- AddForeignKey
ALTER TABLE "public"."publisher_diffusion" ADD CONSTRAINT "publisher_diffusion_diffuseur_publisher_id_fkey" FOREIGN KEY ("diffuseur_publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."publisher_diffusion" ADD CONSTRAINT "publisher_diffusion_annonceur_publisher_id_fkey" FOREIGN KEY ("annonceur_publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
