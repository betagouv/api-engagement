import { Organization as PgOrganization } from "../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../db/postgres";
import { captureException } from "../../error";
import OrganizationModel from "../../models/organization";
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

      const where = { $or: [{ lastExportedToPgAt: null }, { $expr: { $lt: ["$lastExportedToPgAt", "$updatedAt"] } }] };
      const countToSync = await OrganizationModel.countDocuments(where);
      console.log(`[Organization] Found ${countToSync} docs to sync.`);

      while (true) {
        const start = new Date();
        console.log(`[Organization] Fetching docs from ${start.toISOString()}`);
        const data = await OrganizationModel.find(where).select("_id updatedAt").limit(BULK_SIZE).lean();
        console.log(`[Organization] Fetched ${data.length} docs in ${(new Date().getTime() - start.getTime()) / 1000}s.`);
        if (data.length === 0) {
          break;
        }
        counter.processed += data.length;

        const dataToCreate = [] as PgOrganization[];
        const dataToUpdate = [] as PgOrganization[];
        console.log(`[Organization] Processing ${data.length} docs, ${counter.processed} processed so far`);

        // Fetch all existing Orga in one go
        const stored = {} as { [key: string]: Date };

        await prismaClient.organization
          .findMany({
            where: { old_id: { in: data.map((hit) => hit._id.toString()) } },
            select: { old_id: true, updated_at: true },
          })
          .then((data) => data.forEach((d) => (stored[d.old_id] = d.updated_at)));

        for (const hit of data) {
          if (!stored[hit._id.toString()]) {
            const doc = await OrganizationModel.findById(hit._id);
            if (!doc) {
              continue;
            }
            const obj = transformMongoOrganizationToPg(doc);
            if (!obj) {
              continue;
            }
            dataToCreate.push(obj);
          } else if (!isDateEqual(stored[hit._id.toString()], hit.updatedAt)) {
            const doc = await OrganizationModel.findById(hit._id);
            if (!doc) {
              continue;
            }
            const obj = transformMongoOrganizationToPg(doc);
            if (!obj) {
              continue;
            }
            dataToUpdate.push(obj);
          }
        }

        console.log(`[Organization] ${dataToCreate.length} docs to create, ${dataToUpdate.length} docs to update`);

        // Create data
        if (dataToCreate.length) {
          try {
            const res = await prismaClient.organization.createMany({
              data: dataToCreate,
              skipDuplicates: true,
            });
            counter.created += res.count;
            console.log(`[Organization] Created ${res.count} docs, ${counter.created} created so far.`);
          } catch (error) {
            captureException(error, { extra: { dataToCreate } });
            counter.error += dataToCreate.length;
            continue;
          }
        }
        // Update data
        if (dataToUpdate.length) {
          for (const obj of dataToUpdate) {
            try {
              await prismaClient.organization.update({ where: { old_id: obj.old_id }, data: obj });
              counter.updated++;
            } catch (error) {
              captureException(error, { extra: { dataToUpdate } });
              counter.error++;
              continue;
            }
          }

          // Update lastExportedToPgAt
          console.log(`[Organization] Updating lastExportedToPgAt for ${data.length} docs, processed batch in ${(new Date().getTime() - start.getTime()) / 1000}s.`);
          await OrganizationModel.updateMany({ _id: { $in: data.map((hit) => hit._id) } }, { $set: { lastExportedToPgAt: new Date() } }, { timestamps: false });
        }
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
}
