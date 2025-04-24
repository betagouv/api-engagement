/**
 * Interface représentant des statistiques de bot
 */
export interface StatsBot {
  _id?: string;
  origin?: string;
  referer?: string;
  userAgent?: string;
  host?: string;
  user: string;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
