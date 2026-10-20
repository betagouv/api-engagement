const SCW_API_BASE_URL = "https://api.scaleway.com";

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

export interface CreateRdbBackupPayload {
  instance_id: string;
  database_name: string;
  name: string;
  expires_at: string;
}

export interface RdbApiOptions {
  secretKey: string;
  region: string;
}

const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

const getRdbApiHeaders = ({ secretKey }: RdbApiOptions) => {
  if (!secretKey) {
    throw new Error("Missing SCW_SECRET_KEY for Scaleway RDB API access");
  }

  return {
    "Content-Type": "application/json",
    "X-Auth-Token": secretKey,
  };
};

export const createRdbBackup = async (payload: CreateRdbBackupPayload, options: RdbApiOptions): Promise<RdbDatabaseBackup> => {
  const response = await fetch(`${SCW_API_BASE_URL}/rdb/v1/regions/${options.region}/backups`, {
    method: "POST",
    headers: getRdbApiHeaders(options),
    body: JSON.stringify(payload),
  });
  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorBody = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Scaleway RDB backup creation failed (${response.status}): ${errorBody}`);
  }

  return data as RdbDatabaseBackup;
};

export const listRdbBackups = async (instanceId: string, options: RdbApiOptions): Promise<RdbDatabaseBackup[]> => {
  const url = new URL(`${SCW_API_BASE_URL}/rdb/v1/regions/${options.region}/backups`);
  url.searchParams.set("instance_id", instanceId);
  url.searchParams.set("order_by", "created_at_desc");
  url.searchParams.set("page_size", "100");

  const response = await fetch(url, { headers: getRdbApiHeaders(options) });
  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorBody = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Scaleway RDB backup listing failed (${response.status}): ${errorBody}`);
  }

  const backups = (data as { database_backups?: unknown } | null)?.database_backups;
  if (!Array.isArray(backups)) {
    throw new Error("Scaleway RDB backup listing response is missing the database_backups array");
  }

  return backups as RdbDatabaseBackup[];
};

export const exportRdbBackup = async (backupId: string, options: RdbApiOptions): Promise<RdbDatabaseBackup> => {
  const response = await fetch(`${SCW_API_BASE_URL}/rdb/v1/regions/${options.region}/backups/${backupId}/export`, {
    method: "POST",
    headers: getRdbApiHeaders(options),
    body: JSON.stringify({}),
  });
  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorBody = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Scaleway RDB backup export failed (${response.status}): ${errorBody}`);
  }

  return data as RdbDatabaseBackup;
};

export const getRdbBackup = async (backupId: string, options: RdbApiOptions): Promise<RdbDatabaseBackup> => {
  const response = await fetch(`${SCW_API_BASE_URL}/rdb/v1/regions/${options.region}/backups/${backupId}`, {
    headers: getRdbApiHeaders(options),
  });
  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorBody = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Scaleway RDB backup retrieval failed (${response.status}): ${errorBody}`);
  }

  return data as RdbDatabaseBackup;
};
