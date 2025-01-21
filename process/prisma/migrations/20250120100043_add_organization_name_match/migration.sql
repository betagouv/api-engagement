-- Create the OrganizationNameMatch table
CREATE TABLE "OrganizationNameMatch" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "old_id" TEXT UNIQUE,
    "name" TEXT NOT NULL,
    "organization_ids" TEXT[],  -- Array of organization IDs
    "mission_ids" TEXT[],  -- Array of mission IDs
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
