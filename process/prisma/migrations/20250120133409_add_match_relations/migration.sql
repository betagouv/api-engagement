-- Modify the OrganizationNameMatch table
ALTER TABLE "OrganizationNameMatch"
ADD COLUMN "organization_names" TEXT[];

-- Create relation table between Organization and OrganizationNameMatch
CREATE TABLE "_OrganizationToNameMatch" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OrganizationToNameMatch_pkey" PRIMARY KEY ("A", "B"),
    FOREIGN KEY ("A") REFERENCES "Organization"("id") ON DELETE CASCADE,
    FOREIGN KEY ("B") REFERENCES "OrganizationNameMatch"("id") ON DELETE CASCADE
);

-- Create relation table between Mission and OrganizationNameMatch
CREATE TABLE "_MissionToNameMatch" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MissionToNameMatch_pkey" PRIMARY KEY ("A", "B"),
    FOREIGN KEY ("A") REFERENCES "Mission"("id") ON DELETE CASCADE,
    FOREIGN KEY ("B") REFERENCES "OrganizationNameMatch"("id") ON DELETE CASCADE
);
