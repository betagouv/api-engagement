-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'admin');

-- AlterTable
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_pkey" TO "stat_event_pkey";

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'user',
    "invitation_token" TEXT,
    "invitation_expires_at" TIMESTAMP(3),
    "invitation_completed_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "login_at" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "forgot_password_token" TEXT,
    "forgot_password_expires_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "brevo_contact_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_publisher" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_publisher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE INDEX "user_deleted_at_idx" ON "public"."user"("deleted_at");

-- CreateIndex
CREATE INDEX "user_publisher_user_id_idx" ON "public"."user_publisher"("user_id");

-- CreateIndex
CREATE INDEX "user_publisher_publisher_id_idx" ON "public"."user_publisher"("publisher_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_publisher_user_id_publisher_id_key" ON "public"."user_publisher"("user_id", "publisher_id");

-- RenameForeignKey
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_from_publisher_id_fkey" TO "stat_event_from_publisher_id_fkey";

-- RenameForeignKey
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_to_publisher_id_fkey" TO "stat_event_to_publisher_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."user_publisher" ADD CONSTRAINT "user_publisher_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_publisher" ADD CONSTRAINT "user_publisher_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."StatEvent_es_id_key" RENAME TO "stat_event_es_id_key";
