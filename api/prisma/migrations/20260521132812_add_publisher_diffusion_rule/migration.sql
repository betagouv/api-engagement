-- CreateTable
CREATE TABLE "publisher_diffusion_rule" (
    "id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "field_type" TEXT,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "combinator" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_diffusion_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publisher_diffusion_rule_publisher_id_idx" ON "publisher_diffusion_rule"("publisher_id");

-- AddForeignKey
ALTER TABLE "publisher_diffusion_rule" ADD CONSTRAINT "publisher_diffusion_rule_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
