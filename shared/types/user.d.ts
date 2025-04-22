/**
 * Interface représentant un utilisateur
 */
export interface User {
  _id?: string;
  firstname: string;
  lastname?: string;
  publishers: string[];
  email: string;
  password?: string;
  deleted?: boolean;
  last_activity_at?: Date;
  last_login_at?: Date;
  login_at?: Date[];
  forgot_password_reset_token?: string;
  forgot_password_reset_expires?: Date;
  role?: "user" | "admin";
  invitationToken?: string;
  invitationExpiresAt?: Date;
  invitationCompletedAt?: Date;
  brevoContactId?: number | null;
  
  // Timestamps
  created_at?: Date;
  updated_at?: Date;
  
  // Méthodes
  comparePassword?: (password: string) => Promise<boolean>;
}
