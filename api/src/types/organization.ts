export interface OrganizationRecord {
  _id: string;
  id: string;
  rna: string | null;
  siren: string | null;
  siret: string | null;
  sirets: string[];
  rupMi: string | null;
  gestion: string | null;
  status: string | null;
  createdAt: Date;
  lastDeclaredAt: Date | null;
  publishedAt: Date | null;
  dissolvedAt: Date | null;
  updatedAt: Date;
  nature: string | null;
  groupement: string | null;
  title: string;
  names: string[];
  shortTitle: string | null;
  titleSlug: string | null;
  shortTitleSlug: string | null;
  object: string | null;
  socialObject1: string | null;
  socialObject2: string | null;
  addressComplement: string | null;
  addressNumber: string | null;
  addressRepetition: string | null;
  addressType: string | null;
  addressStreet: string | null;
  addressDistribution: string | null;
  addressInseeCode: string | null;
  addressPostalCode: string | null;
  addressDepartmentCode: string | null;
  addressDepartmentName: string | null;
  addressRegion: string | null;
  addressCity: string | null;
  managementDeclarant: string | null;
  managementComplement: string | null;
  managementStreet: string | null;
  managementDistribution: string | null;
  managementPostalCode: string | null;
  managementCity: string | null;
  managementCountry: string | null;
  directorCivility: string | null;
  website: string | null;
  observation: string | null;
  syncAt: Date | null;
  source: string | null;
  isRUP: boolean;
  letudiantPublicId: string | null;
  letudiantUpdatedAt: Date | null;
  lastExportedToPgAt: Date | null;
}

export type OrganizationSearchOrderField = "title" | "updatedAt";

export interface OrganizationSearchParams {
  query?: string;
  department?: string;
  city?: string;
  rna?: string;
  siren?: string;
  siret?: string;
  ids?: string[];
  offset?: number;
  limit?: number;
  includeTotal?: "all" | "filtered" | "none";
  orderBy?: OrganizationSearchOrderField;
  orderDirection?: "asc" | "desc";
}

export interface OrganizationSearchResult {
  results: OrganizationRecord[];
  total: number;
}

export type OrganizationCreateInput = {
  id?: string;
  rna?: string | null;
  siren?: string | null;
  siret?: string | null;
  sirets?: string[] | null;
  rupMi?: string | null;
  gestion?: string | null;
  status?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  lastDeclaredAt?: Date | null;
  publishedAt?: Date | null;
  dissolvedAt?: Date | null;
  nature?: string | null;
  groupement?: string | null;
  title: string;
  names?: string[] | null;
  shortTitle?: string | null;
  titleSlug?: string | null;
  shortTitleSlug?: string | null;
  object?: string | null;
  socialObject1?: string | null;
  socialObject2?: string | null;
  addressComplement?: string | null;
  addressNumber?: string | null;
  addressRepetition?: string | null;
  addressType?: string | null;
  addressStreet?: string | null;
  addressDistribution?: string | null;
  addressInseeCode?: string | null;
  addressPostalCode?: string | null;
  addressDepartmentCode?: string | null;
  addressDepartmentName?: string | null;
  addressRegion?: string | null;
  addressCity?: string | null;
  managementDeclarant?: string | null;
  managementComplement?: string | null;
  managementStreet?: string | null;
  managementDistribution?: string | null;
  managementPostalCode?: string | null;
  managementCity?: string | null;
  managementCountry?: string | null;
  directorCivility?: string | null;
  website?: string | null;
  observation?: string | null;
  syncAt?: Date | null;
  source?: string | null;
  isRUP?: boolean | null;
  letudiantPublicId?: string | null;
  letudiantUpdatedAt?: Date | null;
  lastExportedToPgAt?: Date | null;
};

export type OrganizationUpdatePatch = Partial<Omit<OrganizationCreateInput, "id" | "title">> & {
  title?: string;
};

export type OrganizationUpsertInput = OrganizationCreateInput & {
  rna: string;
};

export interface OrganizationExportCandidate {
  id: string;
  updatedAt: Date;
}
