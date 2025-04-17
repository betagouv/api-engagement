-- CreateTable
CREATE TABLE "MissionHistory" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" JSONB NOT NULL,
    "metadata" JSONB,
    "mission_id" TEXT NOT NULL,

    CONSTRAINT "MissionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionHistory_mission_id_idx" ON "MissionHistory"("mission_id");

-- AddForeignKey
ALTER TABLE "MissionHistory" ADD CONSTRAINT "MissionHistory_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
