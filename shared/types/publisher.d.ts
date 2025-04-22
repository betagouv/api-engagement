/**
 * Interface représentant un diffuseur (sous-élément du publisher)
 */
export interface Diffuseur {
  _id?: string;
  publisherId?: string;
  publisherName: string;
  publisherLogo?: string;
  moderator?: boolean;
  missionType?: "benevolat" | "volontariat" | null;
  // Champs dépréciés (à migrer)
  publisher?: string;
  mission_type?: "benevolat" | "volontariat" | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface représentant une organisation exclue par un publisher
 */
export interface PublisherExcludedOrganization {
  _id?: string;
  publisherId?: string;
  publisherName: string;
  organizationClientId?: string;
  organizationName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface représentant un publisher
 */
export interface Publisher {
  _id?: string;
  name: string;
  status?: "active" | "inactive";
  category?: string | null;
  automated_report?: boolean;
  send_report_to?: string[];
  
  url?: string;
  
  moderator?: boolean;
  moderatorLink?: string;
  email?: string;
  
  documentation?: string;
  logo?: string;
  feed?: string;
  apikey?: string;
  lastSyncAt?: Date;
  
  publishers?: Diffuseur[];
  excludedOrganizations?: PublisherExcludedOrganization[];
  description?: string;
  lead?: string;
  
  // Champs pour les types de missions et ru00f4les
  missionType?: "benevolat" | "volontariat" | null;
  annonceur?: boolean;
  api?: boolean;
  widget?: boolean;
  campaign?: boolean;
  
  // Champs dépréciés
  mission_type?: "benevolat" | "volontariat" | null;
  role_promoteur?: boolean;
  role_annonceur_api?: boolean;
  role_annonceur_widget?: boolean;
  role_annonceur_campagne?: boolean;
  
  excludeOrganisations?: string[];
  lastFetchAt?: Date;
  acceptedCount?: number;
  refusedCount?: number;
  
  // Dates
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  deletedAt?: Date | null;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
