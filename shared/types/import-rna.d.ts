/**
 * Interface représentant un import RNA
 */
export interface ImportRna {
  _id?: string;
  year?: number;
  month?: number;
  resourceId?: string;
  resourceCreatedAt?: Date;
  resourceUrl?: string;
  count?: number;
  
  startedAt: Date;
  endedAt: Date;
  status?: string;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
