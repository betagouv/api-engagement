-- AlterTable
ALTER TABLE "publisher" ADD COLUMN "expected_applications" BOOLEAN,
ADD COLUMN "deployment_user_id" TEXT;

-- CreateIndex
CREATE INDEX "publisher_deployment_user_id_idx" ON "publisher"("deployment_user_id");

-- AddForeignKey
ALTER TABLE "publisher" ADD CONSTRAINT "publisher_deployment_user_id_fkey" FOREIGN KEY ("deployment_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
