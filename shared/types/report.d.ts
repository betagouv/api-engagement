/**
 * Interface représentant un rapport
 */
export interface Report {
  _id?: string;
  name: string;
  
  month: number;
  year: number;
  url?: string | null;
  objectName?: string | null;
  
  publisherId: string;
  publisherName: string;
  
  dataTemplate?: "BOTH" | "RECEIVE" | "SEND" | null;
  sentAt?: Date | null;
  sentTo?: string[];
  
  status?: string;
  
  data?: Record<string, any>;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
