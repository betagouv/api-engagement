import { Organization as PgOrganization } from "../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../db/postgres";
import { captureException } from "../../error";
import { organizationService } from "../../services/organization";
import { OrganizationExportCandidate, OrganizationRecord } from "../../types/organization";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { transformMongoOrganizationToPg } from "./utils/transformer";

const BULK_SIZE = 1000;

export interface ExportOrganizationsToPgPayload {
  jobs?: string;
}

export interface ExportOrganizationsToPgResult extends JobResult {
  counter: {
    processed: number;
    created: number;
    updated: number;
    error: number;
  };
}

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

export class ExportOrganizationsToPgHandler implements BaseHandler<ExportOrganizationsToPgPayload, ExportOrganizationsToPgResult> {
  name = "Export organizations to PG";

  public async handle(payload: ExportOrganizationsToPgPayload): Promise<ExportOrganizationsToPgResult> {
    const start = new Date();
    console.log(`[Organization] Started at ${start.toISOString()}.`);
    const counter = {
      processed: 0,
      created: 0,
      updated: 0,
      error: 0,
    };
    try {
      const count = await prismaClient.organization.count();
      console.log(`[Organization] Found ${count} docs in database.`);

      const countToSync = await organizationService.countOrganizationsByExportBacklog();
      console.log(`[Organization] Found ${countToSync} docs to sync.`);

      const start = new Date();
      console.log(`[Organization] Fetching docs from ${start.toISOString()}`);
      let cursor: string | null = null;
      while (true) {
        const batch = await organizationService.findOrganizationsByExportBacklog(BULK_SIZE, cursor);
        if (!batch.length) {
          break;
        }
        cursor = batch[batch.length - 1].id;
        await this.processBatch(batch, counter);
        counter.processed += batch.length;
        console.log(`[Organization] Processed ${counter.processed} / ${countToSync} docs`);
      }

      console.log(`[Organization] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
      return {
        success: true,
        timestamp: new Date(),
        counter,
      };
    } catch (error) {
      captureException(error, "[Organization] Error while syncing docs.");
      return {
        success: false,
        timestamp: new Date(),
        counter,
      };
    }
  }

  private async processCreate(dataToCreate: PgOrganization[], counter: ExportOrganizationsToPgResult["counter"]): Promise<boolean> {
    if (!dataToCreate.length) {
      return true;
    }

    try {
      const res = await prismaClient.organization.createMany({
        data: dataToCreate,
        skipDuplicates: true,
      });
      counter.created += res.count;
      console.log(`[Organization] Created ${res.count} docs, ${counter.created} created so far.`);
      return true;
    } catch (error) {
      captureException(error, { extra: { dataToCreate } });
      counter.error += dataToCreate.length;
      return false;
    }
  }

  private async processUpdate(dataToUpdate: PgOrganization[], counter: ExportOrganizationsToPgResult["counter"]): Promise<boolean> {
    if (!dataToUpdate.length) {
      return true;
    }

    for (const obj of dataToUpdate) {
      try {
        await prismaClient.organization.update({ where: { old_id: obj.old_id }, data: obj });
        counter.updated++;
      } catch (error) {
        captureException(error, { extra: { dataToUpdate } });
        counter.error++;
        return false;
      }
    }

    return true;
  }

  private async processBatch(batch: OrganizationExportCandidate[], counter: ExportOrganizationsToPgResult["counter"]) {
    if (!batch.length) {
      return;
    }

    const batchStart = Date.now();

    const dataToCreate = [] as PgOrganization[];
    const dataToUpdate = [] as PgOrganization[];

    // Fetch all existing Orga in one go
    const stored = {} as { [key: string]: Date };

    await prismaClient.organization
      .findMany({
        where: { old_id: { in: batch.map((hit) => hit.id) } },
        select: { old_id: true, updated_at: true },
      })
      .then((data) => data.forEach((d) => (stored[d.old_id] = d.updated_at)));

    const idsToCreate: string[] = [];
    const idsToUpdate: string[] = [];

    for (const hit of batch) {
      const idString = hit.id;
      if (!stored[idString]) {
        idsToCreate.push(idString);
        continue;
      }

      if (!isDateEqual(stored[idString], hit.updatedAt)) {
        idsToUpdate.push(idString);
      }
    }

    const idsToFetch = [...idsToCreate, ...idsToUpdate];
    const docById = new Map<string, OrganizationRecord>();

    if (idsToFetch.length) {
      const docs = await organizationService.findOrganizationsByIds(idsToFetch);
      docs.forEach((doc) => {
        docById.set(doc.id, doc);
      });
    }

    for (const id of idsToCreate) {
      const doc = docById.get(id);
      if (!doc) {
        continue;
      }
      const obj = transformMongoOrganizationToPg(doc);
      if (!obj) {
        continue;
      }
      dataToCreate.push(obj);
    }

    for (const id of idsToUpdate) {
      const doc = docById.get(id);
      if (!doc) {
        continue;
      }
      const obj = transformMongoOrganizationToPg(doc);
      if (!obj) {
        continue;
      }
      dataToUpdate.push(obj);
    }

    console.log(`[Organization] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update`);

    let createSuccess = true;
    if (dataToCreate.length) {
      createSuccess = await this.processCreate(dataToCreate, counter);
      if (!createSuccess) {
        return;
      }
    }

    let updateSuccess = true;
    if (dataToUpdate.length) {
      updateSuccess = await this.processUpdate(dataToUpdate, counter);
      if (!updateSuccess) {
        return;
      }
    }

    if (createSuccess && updateSuccess) {
      await organizationService.markExported(batch.map((hit) => hit.id));

      console.log(`[Organization] Processed batch in ${(Date.now() - batchStart) / 1000}s.`);
    }
  }
}
