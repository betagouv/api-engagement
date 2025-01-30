export interface BrevoContact {
  id: number;
  email: string;
  attributes: {
    PRENOM: string;
    NOM: string;
    ENTREPRISE: string;
    EXT_ID: string;
  };
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt: string;
  modifiedAt: string;
  listIds: number[];
  listUnsubscribed: number[] | null;
}
