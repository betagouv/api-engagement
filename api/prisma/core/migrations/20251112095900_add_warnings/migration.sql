-- DropIndex
DROP INDEX "public"."stats_event_from_publisher_created_at_idx";

-- DropIndex
DROP INDEX "public"."stats_event_to_publisher_created_at_idx";

-- CreateTable
CREATE TABLE "public"."warning" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "publisher_id" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    "fixed_at" TIMESTAMP(3),
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warning_publisher_id_idx" ON "public"."warning"("publisher_id");

-- CreateIndex
CREATE INDEX "warning_type_idx" ON "public"."warning"("type");

-- CreateIndex
CREATE INDEX "warning_fixed_idx" ON "public"."warning"("fixed");

-- CreateIndex
CREATE INDEX "warning_created_at_idx" ON "public"."warning"("created_at");

-- CreateIndex
CREATE INDEX "stats_event_from_publisher_created_at_idx" ON "public"."StatEvent"("from_publisher_id", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_to_publisher_created_at_idx" ON "public"."StatEvent"("to_publisher_id", "created_at");

-- AddForeignKey
ALTER TABLE "public"."warning" ADD CONSTRAINT "warning_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
