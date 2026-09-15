-- AlterTable
ALTER TABLE "user" ADD COLUMN     "mfa_code" TEXT,
ADD COLUMN     "mfa_code_expires_at" TIMESTAMP(3);
