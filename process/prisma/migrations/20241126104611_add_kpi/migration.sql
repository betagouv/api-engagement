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

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_old_id_key" ON "Kpi"("old_id");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_date_key" ON "Kpi"("date");
