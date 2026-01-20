-- CreateEnum
CREATE TYPE "public"."ImportRnaStatus" AS ENUM ('SUCCESS', 'ALREADY_UPDATED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."import_rna" (
    "id" TEXT NOT NULL,
    "year" INTEGER,
    "month" INTEGER,
    "resource_id" TEXT,
    "resource_created_at" TIMESTAMP(3),
    "resource_url" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "status" "public"."ImportRnaStatus" DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_rna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_rna_resource_id_idx" ON "public"."import_rna"("resource_id");
