import {
  RDB_BACKUP_DATABASE_NAME,
  RDB_BACKUP_INSTANCE_ID,
  RDB_BACKUP_S3_ACCESS_KEY,
  RDB_BACKUP_S3_BUCKET,
  RDB_BACKUP_S3_ENDPOINT,
  RDB_BACKUP_S3_REGION,
  RDB_BACKUP_S3_SECRET_KEY,
  REGION,
  SCW_SECRET_KEY,
} from "@/config";
import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { exportRdbBackup, getRdbBackup, listRdbBackups, type RdbApiOptions, type RdbDatabaseBackup } from "@/services/scaleway/rdb";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

export interface RdbBackupReplicationJobPayload {}

export interface RdbBackupReplicationJobResult extends JobResult {}

const requiredConfig = () => {
  const missing: string[] = [];

  if (!RDB_BACKUP_INSTANCE_ID) {
    missing.push("RDB_BACKUP_INSTANCE_ID");
  }
  if (!SCW_SECRET_KEY) {
    missing.push("SCW_SECRET_KEY");
  }
  if (!RDB_BACKUP_DATABASE_NAME) {
    missing.push("RDB_BACKUP_DATABASE_NAME");
  }
  if (!RDB_BACKUP_S3_BUCKET) {
    missing.push("RDB_BACKUP_S3_BUCKET");
  }
  if (!RDB_BACKUP_S3_ACCESS_KEY) {
    missing.push("RDB_BACKUP_S3_ACCESS_KEY");
  }
  if (!RDB_BACKUP_S3_SECRET_KEY) {
    missing.push("RDB_BACKUP_S3_SECRET_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Missing RDB backup copy configuration: ${missing.join(", ")}`);
  }

  return {
    instanceId: RDB_BACKUP_INSTANCE_ID,
    databaseName: RDB_BACKUP_DATABASE_NAME,
    bucket: RDB_BACKUP_S3_BUCKET,
    secretKey: SCW_SECRET_KEY!,
  };
};

const sanitizeKeyPart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getObjectKey = (backup: RdbDatabaseBackup) => {
  const instanceName = sanitizeKeyPart(backup.instance_name);
  if (!instanceName) {
    throw new Error(`Le backup ${backup.id} ne contient pas de nom d'instance RDB valide`);
  }

  return `${instanceName}/${backup.created_at.slice(0, 10)}/${backup.id}.dump`;
};

const waitForDownloadUrl = async (backup: RdbDatabaseBackup, options: RdbApiOptions) => {
  const deadline = Date.now() + 30 * 60 * 1000;
  let currentBackup = backup;

  while (!currentBackup.download_url && Date.now() < deadline) {
    if (currentBackup.status === "error") {
      throw new Error(`L'export du backup ${backup.id} a échoué côté Scaleway (status=error)`);
    }

    await new Promise((resolve) => setTimeout(resolve, 15_000));
    currentBackup = await getRdbBackup(backup.id, options);
  }

  if (!currentBackup.download_url) {
    throw new Error(`URL d'export du backup ${backup.id} toujours indisponible après 30 minutes (status=${currentBackup.status})`);
  }

  return currentBackup.download_url;
};

export class RdbBackupReplicationHandler implements BaseHandler<RdbBackupReplicationJobPayload, RdbBackupReplicationJobResult> {
  name = "Réplication du backup RDB vers le bucket security";

  async handle(): Promise<RdbBackupReplicationJobResult> {
    let operation = "validation de la configuration";
    const s3 = new S3Client({
      endpoint: RDB_BACKUP_S3_ENDPOINT,
      region: RDB_BACKUP_S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: RDB_BACKUP_S3_ACCESS_KEY,
        secretAccessKey: RDB_BACKUP_S3_SECRET_KEY,
      },
    });

    try {
      const { instanceId, databaseName, bucket, secretKey } = requiredConfig();
      const rdbApiOptions = { secretKey, region: REGION };
      operation = "lecture de la liste des backups RDB";
      const backups = await listRdbBackups(instanceId, rdbApiOptions);
      const backup = backups.find((item) => item.database_name === databaseName);

      if (!backup) {
        return {
          success: false,
          timestamp: new Date(),
          message: `Aucun backup RDB prêt trouvé pour la base ${databaseName}.`,
        };
      }

      if (backup.status !== "ready") {
        return {
          success: false,
          timestamp: new Date(),
          message: `Le backup RDB le plus récent (${backup.id}) n'est pas encore prêt (status=${backup.status}).`,
        };
      }

      const key = getObjectKey(backup);

      operation = "vérification de la présence de l'objet dans le bucket security";
      const existingObjects = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: key, MaxKeys: 1 }));
      if (existingObjects.Contents?.some((object) => object.Key === key)) {
        return {
          success: true,
          timestamp: new Date(),
          message: `Backup ${backup.id} déjà présent dans s3://${bucket}/${key}; aucune écriture effectuée.`,
        };
      }

      operation = "export du backup via l'API RDB Scaleway";
      const exportedBackup = await exportRdbBackup(backup.id, rdbApiOptions);
      const downloadUrl = await waitForDownloadUrl(exportedBackup, rdbApiOptions);

      operation = "téléchargement du backup depuis Scaleway";
      const download = await fetch(downloadUrl);
      if (!download.ok || !download.body) {
        throw new Error(`Téléchargement du backup ${backup.id} échoué (HTTP ${download.status})`);
      }

      const body = Readable.fromWeb(download.body as Parameters<typeof Readable.fromWeb>[0]);
      operation = "envoi multipart vers le bucket security";
      await new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "application/octet-stream",
          Metadata: { "rdb-backup-id": backup.id },
        },
        partSize: 8 * 1024 * 1024,
        queueSize: 4,
      }).done();

      return {
        success: true,
        timestamp: new Date(),
        message: `Backup ${backup.id} répliqué vers s3://${bucket}/${key} (status=${backup.status}, region=${backup.region}).`,
      };
    } catch (error) {
      const metadata =
        typeof error === "object" && error !== null && "$metadata" in error ? (error as { $metadata?: { httpStatusCode?: number; requestId?: string } }).$metadata : undefined;
      const details = error instanceof Error ? error.message : "erreur inconnue";
      const message = [
        `Échec pendant ${operation}: ${details}`,
        metadata?.httpStatusCode ? `HTTP ${metadata.httpStatusCode}` : undefined,
        metadata?.requestId ? `requestId=${metadata.requestId}` : undefined,
      ]
        .filter(Boolean)
        .join("; ");

      captureException(error, {
        extra: { jobName: "rdb-backup-replication", operation, statusCode: metadata?.httpStatusCode, requestId: metadata?.requestId },
      });
      return {
        success: false,
        timestamp: new Date(),
        message,
      };
    } finally {
      s3.destroy();
    }
  }
}
