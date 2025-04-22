/**
 * Interface représentant un avertissement
 */
export interface Warning {
  _id?: string;
  type: string;
  title?: string;
  description?: string;
  publisherId: string;
  publisherName: string;
  publisherLogo: string;
  seen?: boolean;
  fixed?: boolean;
  fixedAt?: Date;
  occurrences?: number;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
