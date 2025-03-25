-- DropForeignKey
ALTER TABLE "ModerationEvent" DROP CONSTRAINT "ModerationEvent_user_id_fkey";

-- AlterTable
ALTER TABLE "ModerationEvent" ADD COLUMN     "user_name" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
