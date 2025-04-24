/**
 * Interface représentant un import
 */
export interface Import {
  _id?: string;
  name: string;
  publisherId?: string;
  
  // Compteurs
  missionCount?: number;
  refusedCount?: number;
  createdCount?: number;
  deletedCount?: number;
  updatedCount?: number;
  
  // Dates
  startedAt: Date;
  endedAt: Date;
  
  // Statut et erreurs
  status?: string;
  failed?: any[] | Record<string, any>;
}
