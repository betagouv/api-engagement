/*
  Warnings:

  - A unique constraint covering the columns `[excluded_by_publisher_id,excluded_for_publisher_id,organization_client_id]` on the table `OrganizationExclusion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OrganizationExclusion_excluded_by_publisher_id_excluded_for_key" ON "OrganizationExclusion"("excluded_by_publisher_id", "excluded_for_publisher_id", "organization_client_id");
