console.log("launch");
import mongoose from "mongoose";

import type { Prisma } from "../../src/db/core";
import type { UserRecord } from "../../src/types/user";
import { compareDates, compareNumbers, compareStringArrays, compareStrings } from "./utils/compare";
import { loadEnvironment, parseScriptOptions } from "./utils/options";
import { normalizeDate, normalizeNumber } from "./utils/normalize";

type MongoUserDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  firstname?: string | null;
  lastname?: string | null;
  publishers?: Array<{ toString(): string } | string>;
  email?: string | null;
  password?: string | null;
  role?: string | null;
  invitationToken?: string | null;
  invitationExpiresAt?: Date | string | null;
  invitationCompletedAt?: Date | string | null;
  lastActivityAt?: Date | string | null;
  loginAt?: Array<Date | string | null> | null;
  forgotPasswordToken?: string | null;
  forgotPasswordExpiresAt?: Date | string | null;
  deletedAt?: Date | string | null;
  brevoContactId?: number | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type NormalizedUserData = {
  record: UserRecord;
  create: Prisma.UserCreateInput;
  update: Prisma.UserUpdateInput;
};

const BATCH_SIZE = 100;
const options = parseScriptOptions(process.argv.slice(2), "MigrateUsers");
loadEnvironment(options, __dirname, "MigrateUsers");

const roleFromValue = (value: string | null | undefined): "admin" | "user" => {
  return value === "admin" ? "admin" : "user";
};

const toId = (doc: MongoUserDocument): string => {
  if (doc.id && doc.id.trim()) {
    return doc.id.trim();
  }
  if (typeof doc._id === "string") {
    return doc._id.trim();
  }
  if (doc._id && typeof doc._id === "object" && typeof doc._id.toString === "function") {
    return doc._id.toString();
  }
  throw new Error("[MigrateUsers] Encountered a user document without an identifier");
};

const toPublishers = (values: MongoUserDocument["publishers"]): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => {
      if (typeof value === "string") {
        return value;
      }
      if (value && typeof value === "object" && typeof value.toString === "function") {
        return value.toString();
      }
      return "";
    })
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
};

const toLoginHistory = (values: MongoUserDocument["loginAt"]): Date[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized: Date[] = [];
  for (const value of values) {
    const date = normalizeDate(value as Date | string | null);
    if (date) {
      normalized.push(date);
    }
  }
  return normalized;
};

const compareDateArrays = (a: Date[], b: Date[]) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!compareDates(a[i], b[i])) {
      return false;
    }
  }
  return true;
};

const hasDifferences = (existing: UserRecord, target: UserRecord): boolean => {
  if (!compareStrings(existing.firstname, target.firstname)) return true;
  if (!compareStrings(existing.lastname, target.lastname)) return true;
  if (!compareStringArrays(existing.publishers, target.publishers)) return true;
  if (!compareStrings(existing.email, target.email)) return true;
  if (!compareStrings(existing.password, target.password)) return true;
  if (existing.role !== target.role) return true;
  if (!compareStrings(existing.invitationToken, target.invitationToken)) return true;
  if (!compareDates(existing.invitationExpiresAt, target.invitationExpiresAt)) return true;
  if (!compareDates(existing.invitationCompletedAt, target.invitationCompletedAt)) return true;
  if (!compareDates(existing.lastActivityAt, target.lastActivityAt)) return true;
  if (!compareDateArrays(existing.loginAt, target.loginAt)) return true;
  if (!compareStrings(existing.forgotPasswordToken, target.forgotPasswordToken)) return true;
  if (!compareDates(existing.forgotPasswordExpiresAt, target.forgotPasswordExpiresAt)) return true;
  if (!compareDates(existing.deletedAt, target.deletedAt)) return true;
  if (!compareNumbers(existing.brevoContactId, target.brevoContactId)) return true;
  if (!compareDates(existing.createdAt, target.createdAt)) return true;
  if (!compareDates(existing.updatedAt, target.updatedAt)) return true;
  return false;
};

const normalizeUser = (doc: MongoUserDocument): NormalizedUserData => {
  const id = toId(doc);

  const createdAt = normalizeDate(doc.createdAt) ?? new Date();
  const updatedAt = normalizeDate(doc.updatedAt) ?? createdAt;
  const firstname = (doc.firstname ?? "").trim();
  if (!firstname) {
    throw new Error(`[MigrateUsers] User ${id} missing firstname`);
  }
  const email = (doc.email ?? "").toLowerCase().trim();
  if (!email) {
    throw new Error(`[MigrateUsers] User ${id} missing email`);
  }
  const lastname = (doc.lastname ?? "").trim();

  const record: UserRecord = {
    id,
    firstname,
    lastname: lastname.length ? lastname : null,
    publishers: toPublishers(doc.publishers),
    email,
    password: doc.password ?? null,
    role: roleFromValue(doc.role),
    invitationToken: doc.invitationToken ?? null,
    invitationExpiresAt: normalizeDate(doc.invitationExpiresAt),
    invitationCompletedAt: normalizeDate(doc.invitationCompletedAt),
    lastActivityAt: normalizeDate(doc.lastActivityAt),
    loginAt: toLoginHistory(doc.loginAt),
    forgotPasswordToken: doc.forgotPasswordToken ?? null,
    forgotPasswordExpiresAt: normalizeDate(doc.forgotPasswordExpiresAt),
    deletedAt: normalizeDate(doc.deletedAt),
    brevoContactId: normalizeNumber(doc.brevoContactId),
    createdAt,
    updatedAt,
  };

  const create: Prisma.UserCreateInput = {
    id: record.id,
    firstname: record.firstname,
    lastname: record.lastname,
    publishers: record.publishers,
    email: record.email,
    password: record.password ?? undefined,
    role: record.role,
    invitationToken: record.invitationToken,
    invitationExpiresAt: record.invitationExpiresAt,
    invitationCompletedAt: record.invitationCompletedAt,
    lastActivityAt: record.lastActivityAt,
    loginAt: record.loginAt,
    forgotPasswordToken: record.forgotPasswordToken,
    forgotPasswordExpiresAt: record.forgotPasswordExpiresAt,
    deletedAt: record.deletedAt,
    brevoContactId: record.brevoContactId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  if (!create.password) {
    delete create.password;
  }

  const update: Prisma.UserUpdateInput = {
    firstname: record.firstname,
    lastname: record.lastname,
    publishers: { set: record.publishers },
    email: record.email,
    password: record.password ?? null,
    role: record.role,
    invitationToken: record.invitationToken,
    invitationExpiresAt: record.invitationExpiresAt,
    invitationCompletedAt: record.invitationCompletedAt,
    lastActivityAt: record.lastActivityAt,
    loginAt: { set: record.loginAt },
    forgotPasswordToken: record.forgotPasswordToken,
    forgotPasswordExpiresAt: record.forgotPasswordExpiresAt,
    deletedAt: record.deletedAt,
    brevoContactId: record.brevoContactId,
  };

  return { record, create, update };
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const formatRecordForLog = (record: UserRecord) => ({
  id: record.id,
  email: record.email,
  firstname: record.firstname,
  lastname: record.lastname,
  role: record.role,
  publishers: record.publishers,
  deletedAt: record.deletedAt ? record.deletedAt.toISOString() : null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const cleanup = async () => {
  try {
    const { prismaCore } = await import("../../src/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

const main = async () => {
  console.log(`[MigrateUsers] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected }, { userRepository }, { userService }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/repositories/user"),
    import("../../src/services/user"),
  ]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("users");
  const docs = (await collection.find({}).toArray()) as MongoUserDocument[];
  console.log(`[MigrateUsers] Retrieved ${docs.length} user document(s) from MongoDB`);

  if (docs.length === 0) {
    console.log("[MigrateUsers] Nothing to migrate");
    return;
  }

  const normalized = docs.map((doc) => normalizeUser(doc));

  const stats = { created: 0, updated: 0, unchanged: 0 };
  const sampleCreates: UserRecord[] = [];
  const sampleUpdates: { before: UserRecord; after: UserRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = await userService.findUsers({ ids: chunkIds, includeDeleted: true });
    const existingById = new Map(existingRecords.map((record) => [record.id, record]));

    for (const entry of chunk) {
      const existing = existingById.get(entry.record.id);

      if (!existing) {
        stats.created += 1;
        if (options.dryRun) {
          if (sampleCreates.length < 5) {
            sampleCreates.push(entry.record);
          }
        } else {
          await userRepository.create(entry.create);
        }
        continue;
      }

      if (!hasDifferences(existing, entry.record)) {
        stats.unchanged += 1;
        continue;
      }

      stats.updated += 1;
      if (options.dryRun) {
        if (sampleUpdates.length < 5) {
          sampleUpdates.push({ before: existing, after: entry.record });
        }
      } else {
        await userRepository.update({ id: entry.record.id }, entry.update);
      }
    }
  }

  if (options.dryRun) {
    console.log(`[MigrateUsers][Dry-run] Would create ${stats.created} user(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log("[MigrateUsers][Dry-run] Sample creations:");
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log("[MigrateUsers][Dry-run] Sample updates:");
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[MigrateUsers] Created ${stats.created} user(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigrateUsers] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
