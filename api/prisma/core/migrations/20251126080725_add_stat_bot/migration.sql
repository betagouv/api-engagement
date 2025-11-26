-- CreateTable
CREATE TABLE "public"."stat_bot" (
    "id" TEXT NOT NULL,
    "origin" TEXT,
    "referer" TEXT,
    "user_agent" TEXT,
    "host" TEXT,
    "user" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stat_bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stat_bot_user_key" ON "public"."stat_bot"("user");

-- CreateIndex
CREATE INDEX "stats_bot_user_idx" ON "public"."stat_bot"("user");
