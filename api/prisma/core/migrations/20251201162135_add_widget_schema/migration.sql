-- CreateTable
CREATE TABLE "public"."widget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000091',
    "style" TEXT NOT NULL DEFAULT 'page',
    "type" TEXT NOT NULL DEFAULT 'benevolat',
    "location_lat" DOUBLE PRECISION,
    "location_long" DOUBLE PRECISION,
    "location_city" TEXT,
    "distance" TEXT NOT NULL DEFAULT '25km',
    "publishers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url" TEXT,
    "jva_moderation" BOOLEAN NOT NULL DEFAULT false,
    "from_publisher_id" TEXT NOT NULL,
    "from_publisher_name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."widget_rule" (
    "id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "field_type" TEXT,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "combinator" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "widget_from_publisher_id_idx" ON "public"."widget"("from_publisher_id");

-- CreateIndex
CREATE INDEX "widget_active_idx" ON "public"."widget"("active");

-- CreateIndex
CREATE INDEX "widget_deleted_at_idx" ON "public"."widget"("deleted_at");

-- CreateIndex
CREATE INDEX "widget_name_idx" ON "public"."widget"("name");

-- CreateIndex
CREATE INDEX "widget_rule_widget_id_idx" ON "public"."widget_rule"("widget_id");

-- AddForeignKey
ALTER TABLE "public"."widget" ADD CONSTRAINT "widget_from_publisher_id_fkey" FOREIGN KEY ("from_publisher_id") REFERENCES "public"."publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."widget_rule" ADD CONSTRAINT "widget_rule_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "public"."widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
