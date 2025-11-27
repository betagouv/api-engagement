export type UserRole = "user" | "admin";

export interface UserRecord {
  id: string;
  firstname: string;
  lastname: string | null;
  publishers: string[];
  email: string;
  password: string | null;
  role: UserRole;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  invitationCompletedAt: Date | null;
  lastActivityAt: Date | null;
  forgotPasswordToken: string | null;
  forgotPasswordExpiresAt: Date | null;
  deletedAt: Date | null;
  brevoContactId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFindParams {
  email?: string;
  publisherId?: string;
  ids?: string[];
  includeDeleted?: boolean;
}

export interface UserCreateInput {
  id?: string;
  firstname: string;
  lastname?: string | null;
  publishers: string[];
  email: string;
  password?: string | null;
  role?: UserRole;
  invitationToken?: string | null;
  invitationExpiresAt?: Date | null;
  invitationCompletedAt?: Date | null;
  lastActivityAt?: Date | null;
  forgotPasswordToken?: string | null;
  forgotPasswordExpiresAt?: Date | null;
  deletedAt?: Date | null;
  brevoContactId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserUpdatePatch = Partial<Omit<UserCreateInput, "publishers" | "firstname" | "email">> & {
  firstname?: string;
  lastname?: string | null;
  email?: string;
  publishers?: string[];
  password?: string | null;
};
