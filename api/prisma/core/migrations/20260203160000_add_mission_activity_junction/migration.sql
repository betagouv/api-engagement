-- CreateTable
CREATE TABLE "public"."mission_activity" (
    "mission_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_activity_pkey" PRIMARY KEY ("mission_id","activity_id")
);

-- CreateIndex
CREATE INDEX "mission_activity_mission_id_idx" ON "public"."mission_activity"("mission_id");

-- CreateIndex
CREATE INDEX "mission_activity_activity_id_idx" ON "public"."mission_activity"("activity_id");

-- AddForeignKey
ALTER TABLE "public"."mission_activity" ADD CONSTRAINT "mission_activity_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_activity" ADD CONSTRAINT "mission_activity_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
