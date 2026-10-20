import { ENV, RDB_BACKUP_DATABASE_NAME, RDB_BACKUP_INSTANCE_ID, RDB_BACKUP_RETENTION_DAYS, REGION, SCW_SECRET_KEY } from "@/config";
import { createRdbBackup as createScalewayRdbBackup, RdbDatabaseBackup } from "@/services/scaleway/rdb";

const BACKUP_TIMEZONE = "Europe/Paris";

const formatDatePart = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: BACKUP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const sanitizeNamePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const buildRdbBackupName = (date = new Date()) => {
  const env = sanitizeNamePart(ENV || "unknown");
  return `${env}-core-${formatDatePart(date)}`;
};

export const computeRdbBackupExpirationDate = (date = new Date(), retentionDays = RDB_BACKUP_RETENTION_DAYS) => {
  const expiresAt = new Date(date);
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return expiresAt.toISOString();
};

export const createScheduledRdbBackup = async (date = new Date()): Promise<RdbDatabaseBackup> => {
  const missing: string[] = [];

  if (!SCW_SECRET_KEY) {
    missing.push("SCW_SECRET_KEY");
  }
  if (!RDB_BACKUP_INSTANCE_ID) {
    missing.push("RDB_BACKUP_INSTANCE_ID");
  }
  if (!RDB_BACKUP_DATABASE_NAME) {
    missing.push("RDB_BACKUP_DATABASE_NAME");
  }
  if (!Number.isInteger(RDB_BACKUP_RETENTION_DAYS) || RDB_BACKUP_RETENTION_DAYS <= 0) {
    missing.push("RDB_BACKUP_RETENTION_DAYS");
  }

  if (missing.length > 0) {
    throw new Error(`Missing Scaleway RDB backup configuration: ${missing.join(", ")}`);
  }

  return createScalewayRdbBackup(
    {
      instance_id: RDB_BACKUP_INSTANCE_ID,
      database_name: RDB_BACKUP_DATABASE_NAME,
      name: buildRdbBackupName(date),
      expires_at: computeRdbBackupExpirationDate(date),
    },
    { secretKey: SCW_SECRET_KEY!, region: REGION },
  );
};
