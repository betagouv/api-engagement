-- CreateEnum
CREATE TYPE "public"."ImportStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "public"."organization" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."import" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "mission_count" INTEGER NOT NULL DEFAULT 0,
    "refused_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "status" "public"."ImportStatus" NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "failed" JSONB,

    CONSTRAINT "import_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_publisher_id_idx" ON "public"."import"("publisher_id");

-- CreateIndex
CREATE INDEX "import_started_at_idx" ON "public"."import"("started_at");

-- CreateIndex
CREATE INDEX "import_status_idx" ON "public"."import"("status");

-- AddForeignKey
ALTER TABLE "public"."import" ADD CONSTRAINT "import_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
