/**
 * Interface représentant une campagne
 */
export interface Campaign {
  _id?: string;
  name: string;
  type?: "banniere/publicité" | "mailing" | "tuile/bouton" | "autre";
  url: string;
  trackers?: { key: string; value: string }[];
  
  fromPublisherId: string;
  fromPublisherName?: string;
  
  toPublisherId: string;
  toPublisherName?: string;
  
  active?: boolean;
  deletedAt?: Date | null;
  reassignedAt?: Date | null;
  reassignedByUsername?: string | null;
  reassignedByUserId?: string | null;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}
