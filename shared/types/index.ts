// Export all shared types

// Mongoose models types
export interface Mission {
  _id?: string;
  _old_id?: string;
  _old_ids?: string[];
  
  // Mission
  clientId: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  tags?: string[];
  tasks?: string[];
  audience?: string[];
  soft_skills?: string[];
  softSkills?: string[];
  reducedMobilityAccessible?: string;
  closeToTransport?: string;
  openToMinors?: string;
  remote?: string;
  schedule?: string;
  duration?: number;
  postedAt?: Date;
  startAt?: Date;
  endAt?: Date;
  priority?: string;
  places?: number;
  metadata?: string;
  domain: string;
  domainOriginal?: string;
  domainLogo?: string;
  activity?: string;
  type?: string;
  snu?: boolean;
  snuPlaces?: number;
  
  // Address
  adresse?: string;
  address?: string;
  postalCode?: string;
  departmentName?: string;
  departmentCode?: string;
  city?: string;
  region?: string;
  country?: string;
  location?: {
    lat?: number;
    lon?: number;
  };
  addresses?: Address[];
  
  // Organisation
  organizationId?: string;
  organizationUrl?: string;
  organizationName?: string;
  organizationType?: string;
  organizationLogo?: string;
  organizationDescription?: string;
  organizationClientId?: string;
  organizationFullAddress?: string;
  organizationRNA?: string;
  organizationSiren?: string;
  organizationDepartment?: string;
  organizationPostCode?: string;
  organizationCity?: string;
  organizationStatusJuridique?: string;
  organizationBeneficiaries?: string[];
  organizationActions?: string[];
  organizationReseaux?: string[];
  
  // Organization verification
  organizationVerificationStatus?: string;
  organisationIsRUP?: boolean;
  organizationNameVerified?: string;
  organizationRNAVerified?: string;
  organizationSirenVerified?: string;
  organizationSiretVerified?: string;
  organizationAddressVerified?: string;
  organizationCityVerified?: string;
  organizationPostalCodeVerified?: string;
  organizationDepartmentCodeVerified?: string;
  organizationDepartmentNameVerified?: string;
  organizationRegionVerified?: string;
  
  // Publisher (added by the API)
  publisherId: string;
  publisherName: string;
  publisherUrl?: string;
  publisherLogo?: string;
  lastSyncAt: Date;
  applicationUrl?: string;
  statusCode: string;
  statusComment?: string;
  statusCommentHistoric?: {
    status: string;
    comment: string;
    date: Date;
  }[];
  
  // Association (added by the API)
  associationId?: string;
  associationName?: string;
  associationSiren?: string;
  associationRNA?: string;
  associationSources?: string[];
  associationReseaux?: string[];
  associationLogo?: string;
  associationAddress?: string;
  associationCity?: string;
  associationPostalCode?: string;
  associationDepartmentCode?: string;
  associationDepartmentName?: string;
  associationRegion?: string;
  
  // Metadata
  deleted?: boolean;
  deletedAt?: Date;
  
  // Moderation JVA
  moderation_5f5931496c7ea514150a818f_status?: string;
  moderation_5f5931496c7ea514150a818f_comment?: string;
  moderation_5f5931496c7ea514150a818f_note?: string;
  moderation_5f5931496c7ea514150a818f_title?: string;
  moderation_5f5931496c7ea514150a818f_date?: Date;
  
  // LeBonCoin
  leboncoinStatus?: string;
  leboncoinUrl?: string;
  leboncoinComment?: string;
  leboncoinUpdatedAt?: Date;
  
  // JobTeaser
  jobteaserStatus?: string;
  jobteaserUrl?: string;
  jobteaserComment?: string;
  jobteaserUpdatedAt?: Date;
  
  // Historisation
  __history?: {
    date: string;
    state: Partial<Mission>;
  }[];
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Address {
  street?: string;
  postalCode?: string;
  departmentName?: string;
  departmentCode?: string;
  city?: string;
  region?: string;
  country?: string;
  location?: {
    lat?: number;
    lon?: number;
  };
  geoPoint?: {
    type: string;
    coordinates: number[];
  };
  geolocStatus?: string;
}

// Add other types as needed
