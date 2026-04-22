import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { createRdbBackup } from "./client";

export interface RdbBackupJobPayload {}

export interface RdbBackupJobResult extends JobResult {}

export class RdbBackupHandler implements BaseHandler<RdbBackupJobPayload, RdbBackupJobResult> {
  name = "Backup PostgreSQL Scaleway";

  async handle(): Promise<RdbBackupJobResult> {
    const start = new Date();

    try {
      console.log(`[RDB Backup] Starting at ${start.toISOString()}`);

      const backup = await createRdbBackup(start);

      console.log(`[RDB Backup] Backup ${backup.id} created with status=${backup.status}, region=${backup.region}, same_region=${backup.same_region}`);

      return {
        success: true,
        timestamp: new Date(),
        message: `Backup ${backup.name} created (id=${backup.id}, status=${backup.status}, same_region=${backup.same_region}, expires_at=${backup.expires_at})`,
      };
    } catch (error) {
      captureException(error, { extra: { jobName: "rdb-backup" } });

      return {
        success: false,
        timestamp: new Date(),
        message: error instanceof Error ? error.message : "Unknown error while creating Scaleway RDB backup",
      };
    }
  }
}
