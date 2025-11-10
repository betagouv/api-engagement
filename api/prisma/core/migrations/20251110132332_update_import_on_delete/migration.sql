-- DropForeignKey
ALTER TABLE "public"."import" DROP CONSTRAINT "import_publisher_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."import" ADD CONSTRAINT "import_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
