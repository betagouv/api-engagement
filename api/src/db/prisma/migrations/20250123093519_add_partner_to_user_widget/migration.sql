-- CreateTable
CREATE TABLE "PartnerToUser" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,

    CONSTRAINT "PartnerToUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerToWidget" (
    "id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,

    CONSTRAINT "PartnerToWidget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerToUser_partner_id_idx" ON "PartnerToUser"("partner_id");

-- CreateIndex
CREATE INDEX "PartnerToUser_user_id_idx" ON "PartnerToUser"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerToUser_partner_id_user_id_key" ON "PartnerToUser"("partner_id", "user_id");

-- CreateIndex
CREATE INDEX "PartnerToWidget_partner_id_idx" ON "PartnerToWidget"("partner_id");

-- CreateIndex
CREATE INDEX "PartnerToWidget_widget_id_idx" ON "PartnerToWidget"("widget_id");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerToWidget_partner_id_widget_id_key" ON "PartnerToWidget"("partner_id", "widget_id");

-- AddForeignKey
ALTER TABLE "PartnerToUser" ADD CONSTRAINT "PartnerToUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerToUser" ADD CONSTRAINT "PartnerToUser_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerToWidget" ADD CONSTRAINT "PartnerToWidget_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerToWidget" ADD CONSTRAINT "PartnerToWidget_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
