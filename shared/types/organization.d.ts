/**
 * Interface représentant une organisation (association, etc.)
 */
export interface Organization {
  _id?: string;
  esId?: string;
  _old_id?: string;
  rna: string;
  siren?: string;
  siret?: string;
  sirets?: string[];
  rupMi?: string;
  gestion?: string;
  status?: string;
  lastDeclaredAt?: Date;
  publishedAt?: Date;
  dissolvedAt?: Date;
  nature?: string;
  groupement?: string;
  title: string;
  names?: string[];
  shortTitle?: string;
  titleSlug?: string;
  shortTitleSlug?: string;
  object?: string;
  socialObject1?: string;
  socialObject2?: string;
  addressComplement?: string;
  addressNumber?: string;
  addressRepetition?: string;
  addressType?: string;
  addressStreet?: string;
  addressDistribution?: string;
  addressInseeCode?: string;
  addressPostalCode?: string;
  addressDepartmentCode?: string;
  addressDepartmentName?: string;
  addressRegion?: string;
  addressCity?: string;
  managementDeclarant?: string;
  managementComplement?: string;
  managementStreet?: string;
  managementDistribution?: string;
  managementPostalCode?: string;
  managementCity?: string;
  managementCountry?: string;
  directorCivility?: string;
  website?: string;
  observation?: string;
  syncAt?: Date;
  source?: string;
  isRUP?: boolean;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}
