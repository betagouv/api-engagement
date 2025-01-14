import fs from "fs";
import path from "path";
import yauzl from "yauzl";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

import ImportRNAModel from "../../models/import-rna";

import { captureException } from "../../error";
import apiDataGouv from "../../services/api-data-gouv";
import fileParser from "./file-parser";
import { DataGouvResource } from "../../types/data-gouv";

const RNA_DATASETS_ID = "58e53811c751df03df38f42d";

const readZip = async (file: string): Promise<number> => {
  let total = 0;

  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, function (err, zipfile) {
      if (err) throw reject(err);

      zipfile.readEntry();

      zipfile.on("entry", function (entry) {
        console.log(`[Organization] Parsing... ${entry.fileName}`);

        if (/\/$/.test(entry.fileName)) zipfile.readEntry();
        else {
          zipfile.openReadStream(entry, async function (err, readStream) {
            if (err) throw reject(err);

            total += await fileParser.handler(readStream);
            zipfile.readEntry();
          });
        }
      });

      zipfile.on("end", function () {
        resolve(total);
      });
    });
  });
};

const handler = async () => {
  const start = new Date();
  console.log(`[Organization] Starting at ${start.toISOString()}`);

  const resources = await apiDataGouv.get<DataGouvResource[]>(`/datasets/${RNA_DATASETS_ID}/resources?type=main`);
  if (!resources) return captureException("RNA resources not found");

  const resource = resources.filter((r) => r.title.includes("rna_waldec")).sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0];
  if (!resource) return captureException("RNA resource not found");

  console.log(`[Organization] Found resource ${resource.id} ${resource.url}`);

  const exists = await ImportRNAModel.exists({ resourceId: resource.id });
  if (exists) {
    console.log(`[Organization] Already exists, updated at ${new Date()}`);
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
    return;
  }
  console.log(`[Organization] Found new resource ${resource.id} ${resource.url}`);

  const folder = path.join(__dirname, "/tmp");
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  console.log(`[Organization] Downloading ${resource.url} at ${folder}`);
  const response = await fetch(resource.url);
  if (!response.ok) captureException("RNA download failed", JSON.stringify(response, null, 2));
  await streamPipeline(response.body as ReadableStream<any>, fs.createWriteStream(`${folder}/${resource.id}.zip`));

  console.log(`[Organization] Parsing ${resource.id}.zip`);
  const file = path.join(folder, `${resource.id}.zip`);
  const count = await readZip(file);
  console.log(`[Organization] ${count} associations parsed`);

  console.log(`[Organization] Cleaning up files`);
  fs.rmSync(folder, { recursive: true });

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
  console.log(`[Organization] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
};

export default { handler };
