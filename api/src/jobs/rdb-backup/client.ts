import { ENV, RDB_BACKUP_DATABASE_NAME, RDB_BACKUP_INSTANCE_ID, RDB_BACKUP_RETENTION_DAYS, REGION, SCW_SECRET_KEY } from "@/config";

const SCW_API_BASE_URL = "https://api.scaleway.com";
const BACKUP_TIMEZONE = "Europe/Paris";

export interface RdbDatabaseBackup {
  id: string;
  instance_id: string;
  database_name: string;
  name: string;
  status: "unknown" | "creating" | "ready" | "restoring" | "deleting" | "error" | "exporting" | "locked";
  size: number | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  instance_name: string;
  download_url: string | null;
  download_url_expires_at: string | null;
  region: string;
  same_region: boolean;
}

interface CreateRdbBackupPayload {
  instance_id: string;
  database_name: string;
  name: string;
  expires_at: string;
}

interface RdbBackupConfig {
  secretKey: string;
  region: string;
  instanceId: string;
  databaseName: string;
  retentionDays: number;
}

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

const getRequiredBackupConfig = (): RdbBackupConfig => {
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

  return {
    secretKey: SCW_SECRET_KEY!,
    region: REGION,
    instanceId: RDB_BACKUP_INSTANCE_ID,
    databaseName: RDB_BACKUP_DATABASE_NAME,
    retentionDays: RDB_BACKUP_RETENTION_DAYS,
  };
};

const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

export const buildRdbBackupName = (date = new Date()) => {
  const env = sanitizeNamePart(ENV || "unknown");
  return `${env}-core-${formatDatePart(date)}`;
};

export const computeRdbBackupExpirationDate = (date = new Date(), retentionDays = RDB_BACKUP_RETENTION_DAYS) => {
  const expiresAt = new Date(date);
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return expiresAt.toISOString();
};

export const createRdbBackup = async (date = new Date()): Promise<RdbDatabaseBackup> => {
  const { secretKey, region, instanceId, databaseName, retentionDays } = getRequiredBackupConfig();
  const payload: CreateRdbBackupPayload = {
    instance_id: instanceId,
    database_name: databaseName,
    name: buildRdbBackupName(date),
    expires_at: computeRdbBackupExpirationDate(date, retentionDays),
  };

  const response = await fetch(`${SCW_API_BASE_URL}/rdb/v1/regions/${region}/backups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": secretKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorBody = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Scaleway RDB backup creation failed (${response.status}): ${errorBody}`);
  }

  return data as RdbDatabaseBackup;
};
