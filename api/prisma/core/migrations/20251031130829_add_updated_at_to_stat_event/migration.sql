/*
  Warnings:

  - Added the required column `updated_at` to the `StatEvent` table without a default value. This is not possible if the table is not empty.
    - First add required column `updated_at` to the `StatEvent` without not null
    - Backfill `updated_at` with `created_at` column
    - Alter column to set not null parameter to `updated_at

*/
-- AlterTable
ALTER TABLE "public"."StatEvent" ADD COLUMN     "updated_at" TIMESTAMP(3);

-- Backfill
UPDATE "public"."StatEvent" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- AlterTable to set NOT NULL
ALTER TABLE "public"."StatEvent" ALTER COLUMN "updated_at" SET NOT NULL;