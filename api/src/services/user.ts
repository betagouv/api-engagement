import bcrypt from "bcryptjs";

import { Prisma, User } from "../db/core";
import { userRepository } from "../repositories/user";
import type { UserCreateInput, UserFindParams, UserRecord, UserUpdatePatch } from "../types/user";

const SALT_ROUNDS = 10;

const toUserRecord = (user: User): UserRecord => ({
  id: user.id,
  _id: user.id,
  firstname: user.firstname,
  lastname: user.lastname ?? null,
  publishers: user.publishers ?? [],
  email: user.email,
  password: user.password ?? null,
  role: user.role,
  invitationToken: user.invitationToken ?? null,
  invitationExpiresAt: user.invitationExpiresAt ?? null,
  invitationCompletedAt: user.invitationCompletedAt ?? null,
  lastActivityAt: user.lastActivityAt ?? null,
  loginAt: user.loginAt ?? [],
  forgotPasswordToken: user.forgotPasswordToken ?? null,
  forgotPasswordExpiresAt: user.forgotPasswordExpiresAt ?? null,
  deletedAt: user.deletedAt ?? null,
  brevoContactId: user.brevoContactId ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, SALT_ROUNDS);

const buildWhere = (params: UserFindParams = {}): Prisma.UserWhereInput => {
  const where: Prisma.UserWhereInput = {};
  if (!params.includeDeleted) {
    where.deletedAt = null;
  }
  if (params.email) {
    where.email = params.email;
  }
  if (params.publisherId) {
    where.publishers = { has: params.publisherId };
  }
  if (params.ids && params.ids.length > 0) {
    where.id = { in: params.ids };
  }
  return where;
};

const buildCreateData = async (input: UserCreateInput): Promise<Prisma.UserCreateInput> => {
  const data: Prisma.UserCreateInput = {
    id: input.id,
    firstname: input.firstname,
    lastname: input.lastname ?? null,
    publishers: input.publishers,
    email: input.email,
    password: input.password ? await hashPassword(input.password) : null,
    role: input.role ?? "user",
    invitationToken: input.invitationToken ?? null,
    invitationExpiresAt: input.invitationExpiresAt ?? null,
    invitationCompletedAt: input.invitationCompletedAt ?? null,
    lastActivityAt: input.lastActivityAt ?? null,
    loginAt: input.loginAt ?? [],
    forgotPasswordToken: input.forgotPasswordToken ?? null,
    forgotPasswordExpiresAt: input.forgotPasswordExpiresAt ?? null,
    deletedAt: input.deletedAt ?? null,
    brevoContactId: input.brevoContactId ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  if (data.password === null) {
    delete data.password;
  }
  if (!data.createdAt) {
    delete data.createdAt;
  }
  if (!data.updatedAt) {
    delete data.updatedAt;
  }

  return data;
};

const buildUpdateData = async (patch: UserUpdatePatch): Promise<Prisma.UserUpdateInput> => {
  const data: Prisma.UserUpdateInput = {};

  if ("firstname" in patch && patch.firstname !== undefined) {
    data.firstname = patch.firstname;
  }
  if ("lastname" in patch) {
    data.lastname = patch.lastname ?? null;
  }
  if ("email" in patch && patch.email !== undefined) {
    data.email = patch.email;
  }
  if ("role" in patch && patch.role !== undefined) {
    data.role = patch.role;
  }
  if ("publishers" in patch && patch.publishers !== undefined) {
    data.publishers = { set: patch.publishers ?? [] };
  }
  if ("loginAt" in patch) {
    data.loginAt = { set: patch.loginAt ?? [] };
  }
  if ("lastActivityAt" in patch) {
    data.lastActivityAt = patch.lastActivityAt ?? null;
  }
  if ("invitationToken" in patch) {
    data.invitationToken = patch.invitationToken ?? null;
  }
  if ("invitationExpiresAt" in patch) {
    data.invitationExpiresAt = patch.invitationExpiresAt ?? null;
  }
  if ("invitationCompletedAt" in patch) {
    data.invitationCompletedAt = patch.invitationCompletedAt ?? null;
  }
  if ("forgotPasswordToken" in patch) {
    data.forgotPasswordToken = patch.forgotPasswordToken ?? null;
  }
  if ("forgotPasswordExpiresAt" in patch) {
    data.forgotPasswordExpiresAt = patch.forgotPasswordExpiresAt ?? null;
  }
  if ("deletedAt" in patch) {
    data.deletedAt = patch.deletedAt ?? null;
  }
  if ("brevoContactId" in patch) {
    data.brevoContactId = patch.brevoContactId ?? null;
  }
  if ("password" in patch) {
    data.password = patch.password ? await hashPassword(patch.password) : null;
  }

  return data;
};

export const userService = {
  async findUsers(params: UserFindParams = {}): Promise<UserRecord[]> {
    const users = await userRepository.findMany({ where: buildWhere(params), orderBy: { createdAt: Prisma.SortOrder.desc } });
    return users.map(toUserRecord);
  },

  async findUserById(id: string, options: { includeDeleted?: boolean } = {}): Promise<UserRecord | null> {
    const user = await userRepository.findUnique({ where: { id } });
    if (!user) {
      return null;
    }
    if (!options.includeDeleted && user.deletedAt) {
      return null;
    }
    return toUserRecord(user);
  },

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const user = await userRepository.findFirst({ where: { email } });
    return user ? toUserRecord(user) : null;
  },

  async findUserByInvitationToken(token: string): Promise<UserRecord | null> {
    const user = await userRepository.findFirst({ where: { invitationToken: token } });
    return user ? toUserRecord(user) : null;
  },

  async findUserByForgotPasswordToken(token: string): Promise<UserRecord | null> {
    const user = await userRepository.findFirst({ where: { forgotPasswordToken: token } });
    return user ? toUserRecord(user) : null;
  },

  async createUser(input: UserCreateInput): Promise<UserRecord> {
    const data = await buildCreateData(input);
    const created = await userRepository.create(data);
    return toUserRecord(created);
  },

  async updateUser(id: string, patch: UserUpdatePatch): Promise<UserRecord> {
    const data = await buildUpdateData(patch);
    const updated = await userRepository.update({ id }, data);
    return toUserRecord(updated);
  },

  async comparePassword(user: UserRecord, candidate: string): Promise<boolean> {
    if (!user.password) {
      return false;
    }
    return bcrypt.compare(candidate, user.password);
  },

  async removePublisherFromUsers(publisherId: string): Promise<number> {
    const users = await this.findUsers({ publisherId, includeDeleted: true });
    let updated = 0;
    for (const user of users) {
      const publishers = user.publishers.filter((value) => value !== publisherId);
      await this.updateUser(user.id, { publishers });
      updated++;
    }
    return updated;
  },
};
