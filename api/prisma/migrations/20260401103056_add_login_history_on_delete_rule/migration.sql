-- DropForeignKey
ALTER TABLE "login_history" DROP CONSTRAINT "login_history_user_id_fkey";

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
