-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'admin');

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "publishers" TEXT[] DEFAULT ARRAY[]::TEXT[],
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

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE INDEX "user_deleted_at_idx" ON "public"."user"("deleted_at");
