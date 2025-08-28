import { captureException } from "@sentry/node";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { ReadableStream } from "stream/web";

import ImportRNAModel from "../../models/import-rna";

import apiDataGouv from "../../services/data-gouv/api";
import { DataGouvResource } from "../../services/data-gouv/types";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { readZip } from "./zip";

const RNA_DATASETS_ID = "58e53811c751df03df38f42d";

export interface ImportOrganizationsJobPayload {}

export interface ImportOrganizationsJobResult extends JobResult {}

export class ImportOrganizationsHandler implements BaseHandler<ImportOrganizationsJobPayload, ImportOrganizationsJobResult> {
  name = "Import des RNA de data.gouv.fr";

  public async handle(payload: ImportOrganizationsJobPayload): Promise<ImportOrganizationsJobResult> {
    const start = new Date();
    let success = false;
    let count = 0;
    console.log(`[ImportOrganizations] Starting at ${start.toISOString()}`);

    const resources = await apiDataGouv.get<DataGouvResource[]>(`/datasets/${RNA_DATASETS_ID}/resources?type=main`);
    if (!resources) {
      captureException("RNA resources not found");
      return {
        success: false,
        timestamp: new Date(),
        message: "RNA resources not found",
      };
    }

    const resource = resources.filter((r) => r.title.includes("rna_waldec")).sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0];
    if (!resource) {
      captureException("RNA resource not found");
      return {
        success: false,
        timestamp: new Date(),
        message: "RNA resource not found",
      };
    }

    console.log(`[ImportOrganizations] Found resource ${resource.id} ${resource.url}`);

    const exists = await ImportRNAModel.exists({ resourceId: resource.id });
    if (exists) {
      console.log(`[ImportOrganizations] Already exists, updated at ${new Date()}`);
      await ImportRNAModel.create({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        resourceId: resource.id,
        resourceCreatedAt: new Date(resource.created_at),
        resourceUrl: resource.url,
        startedAt: start,
        endedAt: new Date(),
        status: "ALREADY_UPDATED",
      });
      return {
        success: true,
        timestamp: new Date(),
        message: "RNA resource already parsed",
      };
    }
    console.log(`[ImportOrganizations] Found new resource ${resource.id} ${resource.url}`);

    const folder = path.join(__dirname, "/tmp");
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    try {
      const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
      console.log(`[ImportOrganizations] Downloading ${resource.url} into ${folder} (timeout=${DOWNLOAD_TIMEOUT_MS}ms)`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
      const response = await fetch(resource.url, { signal: controller.signal as any });
      clearTimeout(timeout);

      if (!response.ok || !response.body) {
        throw new Error(response.statusText);
      }
      console.log(
        `[ImportOrganizations] Response headers: content-type=${response.headers.get("content-type")} content-length=${response.headers.get("content-length")}`
      );

      const zipPath = `${folder}/${resource.id}.zip`;
      const dlStart = Date.now();
      await pipeline(Readable.fromWeb(response.body as ReadableStream<any>), fs.createWriteStream(zipPath));
      const dlDuration = (Date.now() - dlStart) / 1000;
      const fileSize = fs.existsSync(zipPath) ? fs.statSync(zipPath).size : 0;
      console.log(`[ImportOrganizations] Downloaded to ${zipPath} (${fileSize} bytes) in ${dlDuration}s`);

      console.log(`[ImportOrganizations] Parsing ${resource.id}.zip`);
      const file = path.join(folder, `${resource.id}.zip`);
      const parseStart = Date.now();
      count = await readZip(file);
      const parseDuration = (Date.now() - parseStart) / 1000;
      console.log(`[ImportOrganizations] ${count} associations parsed in ${parseDuration}s`);

      await ImportRNAModel.create({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        resourceId: resource.id,
        resourceCreatedAt: new Date(resource.created_at),
        resourceUrl: resource.url,
        count,
        startedAt: start,
        endedAt: new Date(),
        status: "SUCCESS",
      });
      success = true;
      console.log(`[ImportOrganizations] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
    } catch (error) {
      captureException("RNA import failed", { extra: { resource } });
      success = false;
    } finally {
      console.log(`[ImportOrganizations] Cleaning up files`);
      if (fs.existsSync(folder)) {
        fs.rmSync(folder, { recursive: true });
      }
    }
    return {
      success,
      timestamp: new Date(),
      message: success ? `\t• Nombre d'associations importées: ${count}` : "RNA import failed",
    };
  }
}
