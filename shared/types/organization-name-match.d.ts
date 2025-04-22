/**
 * Interface représentant une correspondance de nom d'organisation
 */
export interface OrganizationNameMatch {
  _id?: string;
  name: string;
  organizationIds: string[];
  organizationNames: string[];
  missionIds: string[];
  matchCount: number;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
