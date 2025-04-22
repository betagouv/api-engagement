/**
 * Interface représentant un avertissement de bot
 */
export interface WarningBot {
  _id?: string;
  hash: string;
  userAgent: string;
  printCount: number;
  clickCount: number;
  applyCount: number;
  accountCount: number;
  publisherId: string;
  publisherName: string;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
