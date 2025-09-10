-- CreateTable
CREATE TABLE "OrganizationExclusion" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_client_id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "excluded_by_publisher_id" TEXT NOT NULL,
    "excluded_for_publisher_id" TEXT NOT NULL,

    CONSTRAINT "OrganizationExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationExclusion_old_id_key" ON "OrganizationExclusion"("old_id");

-- AddForeignKey
ALTER TABLE "OrganizationExclusion" ADD CONSTRAINT "OrganizationExclusion_excluded_by_publisher_id_fkey" FOREIGN KEY ("excluded_by_publisher_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationExclusion" ADD CONSTRAINT "OrganizationExclusion_excluded_for_publisher_id_fkey" FOREIGN KEY ("excluded_for_publisher_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
