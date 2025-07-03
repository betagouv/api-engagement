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
  public async handle(payload: ImportOrganizationsJobPayload): Promise<ImportOrganizationsJobResult> {
    const start = new Date();
    console.log(`[ImportOrganizations] Starting at ${start.toISOString()}`);

    const resources = await apiDataGouv.get<DataGouvResource[]>(`/datasets/${RNA_DATASETS_ID}/resources?type=main`);
    if (!resources) {
      captureException("RNA resources not found");
      return returnResult(false);
    }

    const resource = resources.filter((r) => r.title.includes("rna_waldec")).sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0];
    if (!resource) {
      captureException("RNA resource not found");
      return returnResult(false);
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
      return returnResult(false);
    }
    console.log(`[ImportOrganizations] Found new resource ${resource.id} ${resource.url}`);

    const folder = path.join(__dirname, "/tmp");
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    try {
      console.log(`[ImportOrganizations] Downloading ${resource.url} at ${folder}`);
      const response = await fetch(resource.url);
      if (!response.ok) {
        captureException(`RNA download failed with status: ${response.status}`, { extra: { url: resource.url, status: response.status, statusText: response.statusText } });
        return returnResult(false);
      }
      if (!response.body) {
        captureException("RNA download failed, response body is null", { extra: { url: resource.url } });
        return returnResult(false);
      }

      await pipeline(Readable.fromWeb(response.body as ReadableStream<any>), fs.createWriteStream(`${folder}/${resource.id}.zip`));

      let count = 0;
      try {
        console.log(`[ImportOrganizations] Parsing ${resource.id}.zip`);
        const file = path.join(folder, `${resource.id}.zip`);
        count = await readZip(file);
        console.log(`[ImportOrganizations] ${count} associations parsed`);
      } catch (error) {
        captureException("RNA parsing failed", { extra: { originalError: error } });
        return returnResult(false);
      }

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
      console.log(`[ImportOrganizations] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);

      return returnResult(true);
    } finally {
      console.log(`[ImportOrganizations] Cleaning up files`);
      if (fs.existsSync(folder)) {
        fs.rmSync(folder, { recursive: true });
      }
    }
  }
}

const returnResult = (success: boolean) => {
  return {
    success,
    timestamp: new Date(),
  };
};
