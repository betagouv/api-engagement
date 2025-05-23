-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('benevolat', 'volontariat');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('api', 'widget', 'campaign', 'seo', 'jstag');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "mission_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "campaign_id" TEXT,
    "widget_id" TEXT,
    "source" "SourceType",
    "url" TEXT,
    "from_partner_id" TEXT,
    "to_partner_id" TEXT,
    "old_view_id" TEXT,
    "click_id" TEXT,
    "source_id" TEXT,
    "host" TEXT,
    "tag" TEXT,
    "mission_old_id" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apply" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "mission_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "campaign_id" TEXT,
    "widget_id" TEXT,
    "source" "SourceType",
    "host" TEXT,
    "from_partner_id" TEXT,
    "to_partner_id" TEXT,
    "tag" TEXT,
    "status" TEXT,
    "old_view_id" TEXT,
    "click_id" TEXT,
    "source_id" TEXT,
    "mission_old_id" TEXT,

    CONSTRAINT "Apply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "old_id" TEXT NOT NULL,
    "name" TEXT,
    "diffuseur_id" TEXT NOT NULL,
    "annonceur_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reassigned_at" TIMESTAMP(3),
    "reassigned_by_user_id" TEXT,
    "reassigned_by_user_name" TEXT,
    "type" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Click" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "mission_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "campaign_id" TEXT,
    "widget_id" TEXT,
    "source" "SourceType",
    "host" TEXT,
    "from_partner_id" TEXT,
    "to_partner_id" TEXT,
    "tag" TEXT,
    "source_id" TEXT,
    "mission_old_id" TEXT,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "created_count" INTEGER,
    "deleted_count" INTEGER,
    "updated_count" INTEGER,
    "partner_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Impression" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT,
    "to_partner_id" TEXT,
    "from_partner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "campaign_id" TEXT,
    "widget_id" TEXT,
    "host" TEXT,
    "source" "SourceType",
    "source_id" TEXT,
    "old_id" TEXT NOT NULL,
    "mission_old_id" TEXT,

    CONSTRAINT "Impression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "available_benevolat_mission_count" INTEGER NOT NULL,
    "available_volontariat_mission_count" INTEGER NOT NULL,
    "available_benevolat_given_by_partner_place_count" INTEGER NOT NULL,
    "available_volontariat_given_by_partner_place_count" INTEGER NOT NULL,
    "available_benevolat_attributed_by_api_place_count" INTEGER NOT NULL,
    "available_volontariat_attributed_by_api_place_count" INTEGER NOT NULL,
    "percentage_benevolat_given_by_partner_places" DOUBLE PRECISION NOT NULL,
    "percentage_volontariat_given_by_partner_places" DOUBLE PRECISION NOT NULL,
    "percentage_benevolat_attributed_by_api_places" DOUBLE PRECISION NOT NULL,
    "percentage_volontariat_attributed_by_api_places" DOUBLE PRECISION NOT NULL,
    "benevolat_print_mission_count" INTEGER NOT NULL,
    "volontariat_print_mission_count" INTEGER NOT NULL,
    "benevolat_click_mission_count" INTEGER NOT NULL,
    "volontariat_click_mission_count" INTEGER NOT NULL,
    "benevolat_apply_mission_count" INTEGER NOT NULL,
    "volontariat_apply_mission_count" INTEGER NOT NULL,
    "benevolat_account_mission_count" INTEGER NOT NULL,
    "volontariat_account_mission_count" INTEGER NOT NULL,
    "benevolat_print_count" INTEGER NOT NULL,
    "volontariat_print_count" INTEGER NOT NULL,
    "benevolat_click_count" INTEGER NOT NULL,
    "volontariat_click_count" INTEGER NOT NULL,
    "benevolat_apply_count" INTEGER NOT NULL,
    "volontariat_apply_count" INTEGER NOT NULL,
    "benevolat_account_count" INTEGER NOT NULL,
    "volontariat_account_count" INTEGER NOT NULL,

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "old_id" TEXT NOT NULL,
    "department_name" TEXT,
    "department_code" TEXT,
    "address" TEXT,
    "domain" TEXT NOT NULL,
    "activity" TEXT,
    "region" TEXT,
    "country" TEXT,
    "partner_id" TEXT,
    "description" TEXT,
    "type" "MissionType",
    "duration" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "open_to_minors" TEXT,
    "organization_actions" TEXT[],
    "organization_beneficiaries" TEXT[],
    "organization_city" TEXT,
    "organization_description" TEXT,
    "organization_logo" TEXT,
    "organization_name" TEXT,
    "organization_rna" TEXT,
    "organization_reseaux" TEXT[],
    "organization_siren" TEXT,
    "organization_status_juridique" TEXT,
    "organization_url" TEXT,
    "organization_full_address" TEXT,
    "schedule" TEXT,
    "remote" TEXT,
    "last_sync_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "status_comment" TEXT,
    "posted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "close_to_transport" TEXT,
    "reduced_mobility_accessible" TEXT,
    "start_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "audience" TEXT[],
    "geoloc_status" TEXT,
    "rna_status" TEXT,
    "snu" BOOLEAN,
    "snu_places" INTEGER,
    "tags" TEXT[],
    "jva_moderation_comment" TEXT,
    "jva_moderation_status" TEXT,
    "jva_moderation_title" TEXT,
    "organization_client_id" TEXT,
    "organization_department" TEXT,
    "association_id" TEXT,
    "association_rna" TEXT,
    "city" TEXT,
    "client_id" TEXT,
    "description_html" TEXT,
    "jva_moderation_updated_at" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "leboncoin_moderation_comment" TEXT,
    "leboncoin_moderation_status" TEXT,
    "leboncoin_moderation_updated_at" TIMESTAMP(3),
    "leboncoin_moderation_url" TEXT,
    "longitude" DOUBLE PRECISION,
    "metadata" TEXT,
    "organization_postal_code" TEXT,
    "postal_code" TEXT,
    "priority" TEXT,
    "soft_skills" TEXT[],
    "tasks" TEXT[],
    "places" INTEGER,
    "matched_organization_id" TEXT,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "rna" TEXT NOT NULL,
    "siren" TEXT,
    "siret" TEXT,
    "rup_mi" TEXT,
    "gestion" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_declared_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "dissolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "nature" TEXT,
    "groupement" TEXT,
    "title" TEXT NOT NULL,
    "short_title" TEXT,
    "title_slug" TEXT NOT NULL,
    "short_title_slug" TEXT NOT NULL,
    "names" TEXT[],
    "object" TEXT,
    "social_object1" TEXT,
    "social_object2" TEXT,
    "address_complement" TEXT,
    "address_number" TEXT,
    "address_repetition" TEXT,
    "address_type" TEXT,
    "address_street" TEXT,
    "address_distribution" TEXT,
    "address_insee_code" TEXT,
    "address_postal_code" TEXT,
    "address_department_code" TEXT,
    "address_department_name" TEXT,
    "address_region" TEXT,
    "address_city" TEXT,
    "management_declarant" TEXT,
    "management_complement" TEXT,
    "management_street" TEXT,
    "management_distribution" TEXT,
    "management_postal_code" TEXT,
    "management_city" TEXT,
    "management_country" TEXT,
    "director_civility" TEXT,
    "website" TEXT,
    "observation" TEXT,
    "sync_at" TIMESTAMP(3),
    "source" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "name" TEXT,
    "diffuseur_api" BOOLEAN NOT NULL,
    "diffuseur_widget" BOOLEAN NOT NULL,
    "diffuseur_campaign" BOOLEAN NOT NULL,
    "annonceur" BOOLEAN NOT NULL,
    "api_key" TEXT,
    "partners" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "forgot_password_reset_token" TEXT,
    "role" TEXT,
    "password" TEXT,
    "email" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "first_name" TEXT,
    "last_name" TEXT,
    "invitation_completed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "diffuseur_id" TEXT NOT NULL,
    "mission_type" "MissionType",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetQuery" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "domain" TEXT[],
    "organization" TEXT[],
    "department" TEXT[],
    "schedule" TEXT[],
    "remote" TEXT[],
    "action" TEXT[],
    "beneficiary" TEXT[],
    "country" TEXT[],
    "minor" TEXT[],
    "accessibility" TEXT[],
    "duration" INTEGER,
    "start" TIMESTAMP(3),
    "search" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "size" INTEGER,
    "from" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_old_id_key" ON "Account"("old_id");

-- CreateIndex
CREATE INDEX "account_mission_id" ON "Account"("mission_id");

-- CreateIndex
CREATE INDEX "account_campaign_id" ON "Account"("campaign_id");

-- CreateIndex
CREATE INDEX "account_widget_id" ON "Account"("widget_id");

-- CreateIndex
CREATE INDEX "account_from_partner_id" ON "Account"("from_partner_id");

-- CreateIndex
CREATE INDEX "account_to_partner_id" ON "Account"("to_partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "Apply_old_id_key" ON "Apply"("old_id");

-- CreateIndex
CREATE INDEX "apply_mission_id" ON "Apply"("mission_id");

-- CreateIndex
CREATE INDEX "apply_campaign_id" ON "Apply"("campaign_id");

-- CreateIndex
CREATE INDEX "apply_widget_id" ON "Apply"("widget_id");

-- CreateIndex
CREATE INDEX "apply_from_partner_id" ON "Apply"("from_partner_id");

-- CreateIndex
CREATE INDEX "apply_to_partner_id" ON "Apply"("to_partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_old_id_key" ON "Campaign"("old_id");

-- CreateIndex
CREATE INDEX "campaign_diffuseur_id" ON "Campaign"("diffuseur_id");

-- CreateIndex
CREATE INDEX "campaign_annonceur_id" ON "Campaign"("annonceur_id");

-- CreateIndex
CREATE UNIQUE INDEX "Click_old_id_key" ON "Click"("old_id");

-- CreateIndex
CREATE INDEX "click_mission_id" ON "Click"("mission_id");

-- CreateIndex
CREATE INDEX "click_campaign_id" ON "Click"("campaign_id");

-- CreateIndex
CREATE INDEX "click_widget_id" ON "Click"("widget_id");

-- CreateIndex
CREATE INDEX "click_from_partner_id" ON "Click"("from_partner_id");

-- CreateIndex
CREATE INDEX "click_to_partner_id" ON "Click"("to_partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "Import_old_id_key" ON "Import"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "Impression_old_id_key" ON "Impression"("old_id");

-- CreateIndex
CREATE INDEX "impression_mission_id" ON "Impression"("mission_id");

-- CreateIndex
CREATE INDEX "impression_to_partner_id" ON "Impression"("to_partner_id");

-- CreateIndex
CREATE INDEX "impression_from_partner_id" ON "Impression"("from_partner_id");

-- CreateIndex
CREATE INDEX "impression_campaign_id" ON "Impression"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_old_id_key" ON "Kpi"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_date_key" ON "Kpi"("date");

-- CreateIndex
CREATE INDEX "login_history" ON "LoginHistory"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_old_id_key" ON "Mission"("old_id");

-- CreateIndex
CREATE INDEX "mission_client_id" ON "Mission"("client_id");

-- CreateIndex
CREATE INDEX "mission_matched_organization_id" ON "Mission"("matched_organization_id");

-- CreateIndex
CREATE INDEX "mission_partner_id" ON "Mission"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_old_id_key" ON "Organization"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_old_id_key" ON "Partner"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_old_id_key" ON "User"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "Widget_old_id_key" ON "Widget"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetQuery_old_id_key" ON "WidgetQuery"("old_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "Click"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_from_partner_id_fkey" FOREIGN KEY ("from_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_to_partner_id_fkey" FOREIGN KEY ("to_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apply" ADD CONSTRAINT "Apply_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apply" ADD CONSTRAINT "Apply_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "Click"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apply" ADD CONSTRAINT "Apply_from_partner_id_fkey" FOREIGN KEY ("from_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apply" ADD CONSTRAINT "Apply_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apply" ADD CONSTRAINT "Apply_to_partner_id_fkey" FOREIGN KEY ("to_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apply" ADD CONSTRAINT "Apply_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_annonceur_id_fkey" FOREIGN KEY ("annonceur_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_diffuseur_id_fkey" FOREIGN KEY ("diffuseur_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_from_partner_id_fkey" FOREIGN KEY ("from_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_to_partner_id_fkey" FOREIGN KEY ("to_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impression" ADD CONSTRAINT "Impression_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impression" ADD CONSTRAINT "Impression_from_partner_id_fkey" FOREIGN KEY ("from_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impression" ADD CONSTRAINT "Impression_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impression" ADD CONSTRAINT "Impression_to_partner_id_fkey" FOREIGN KEY ("to_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impression" ADD CONSTRAINT "Impression_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_matched_organization_id_fkey" FOREIGN KEY ("matched_organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_diffuseur_id_fkey" FOREIGN KEY ("diffuseur_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetQuery" ADD CONSTRAINT "WidgetQuery_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

