-- CreateTable
CREATE TABLE "mission_scoring" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "mission_enrichment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_scoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_scoring_value" (
    "id" TEXT NOT NULL,
    "mission_scoring_id" TEXT NOT NULL,
    "mission_enrichment_value_id" TEXT NOT NULL,
    "taxonomy_value_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_scoring_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scoring" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_scoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scoring_value" (
    "id" TEXT NOT NULL,
    "user_scoring_id" TEXT NOT NULL,
    "taxonomy_value_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_scoring_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scoring_geo" (
    "user_scoring_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "radius_km" DOUBLE PRECISION,
    "country_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_scoring_geo_pkey" PRIMARY KEY ("user_scoring_id")
);

-- CreateIndex
CREATE INDEX "mission_scoring_mission_id_idx" ON "mission_scoring"("mission_id");

-- CreateIndex
CREATE INDEX "mission_scoring_mission_enrichment_id_idx" ON "mission_scoring"("mission_enrichment_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_scoring_mission_id_mission_enrichment_id_key" ON "mission_scoring"("mission_id", "mission_enrichment_id");

-- CreateIndex
CREATE INDEX "mission_scoring_value_mission_scoring_id_idx" ON "mission_scoring_value"("mission_scoring_id");

-- CreateIndex
CREATE INDEX "mission_scoring_value_taxonomy_value_id_idx" ON "mission_scoring_value"("taxonomy_value_id");

-- CreateIndex
CREATE INDEX "mission_scoring_value_mission_enrichment_value_id_idx" ON "mission_scoring_value"("mission_enrichment_value_id");

-- CreateIndex
CREATE INDEX "mission_scoring_value_taxonomy_value_score_desc_idx" ON "mission_scoring_value"("taxonomy_value_id", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "mission_scoring_value_mission_scoring_taxonomy_value_key" ON "mission_scoring_value"("mission_scoring_id", "taxonomy_value_id");

-- CreateIndex
CREATE INDEX "user_scoring_expires_at_idx" ON "user_scoring"("expires_at");

-- CreateIndex
CREATE INDEX "user_scoring_value_user_scoring_id_idx" ON "user_scoring_value"("user_scoring_id");

-- CreateIndex
CREATE INDEX "user_scoring_value_taxonomy_value_id_idx" ON "user_scoring_value"("taxonomy_value_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_scoring_value_user_scoring_taxonomy_value_key" ON "user_scoring_value"("user_scoring_id", "taxonomy_value_id");

-- AddForeignKey
ALTER TABLE "mission_scoring" ADD CONSTRAINT "mission_scoring_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_scoring" ADD CONSTRAINT "mission_scoring_mission_enrichment_id_fkey" FOREIGN KEY ("mission_enrichment_id") REFERENCES "mission_enrichment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_scoring_value" ADD CONSTRAINT "mission_scoring_value_mission_scoring_id_fkey" FOREIGN KEY ("mission_scoring_id") REFERENCES "mission_scoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_scoring_value" ADD CONSTRAINT "mission_scoring_value_mission_enrichment_value_id_fkey" FOREIGN KEY ("mission_enrichment_value_id") REFERENCES "mission_enrichment_value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_scoring_value" ADD CONSTRAINT "mission_scoring_value_taxonomy_value_id_fkey" FOREIGN KEY ("taxonomy_value_id") REFERENCES "taxonomy_value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scoring_value" ADD CONSTRAINT "user_scoring_value_user_scoring_id_fkey" FOREIGN KEY ("user_scoring_id") REFERENCES "user_scoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scoring_value" ADD CONSTRAINT "user_scoring_value_taxonomy_value_id_fkey" FOREIGN KEY ("taxonomy_value_id") REFERENCES "taxonomy_value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scoring_geo" ADD CONSTRAINT "user_scoring_geo_user_scoring_id_fkey" FOREIGN KEY ("user_scoring_id") REFERENCES "user_scoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;
