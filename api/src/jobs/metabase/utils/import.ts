import { Import as PrismaImport } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import { importService } from "../../../services/import";
import type { ImportRecord } from "../../../types/import";

const BATCH_SIZE = 5000;

const buildData = (doc: ImportRecord, partners: { [key: string]: string }) => {
  const partnerId = partners[doc.publisherId];
  if (!partnerId) {
    console.log(`[Imports] Patner ${doc.publisherId.toString()} not found for doc ${doc._id}`);
    return null;
  }
  const obj = {
    old_id: doc._id,
    created_count: doc.createdCount,
    deleted_count: doc.deletedCount,
    updated_count: doc.updatedCount,
    partner_id: partnerId,
    started_at: doc.startedAt,
    ended_at: doc.endedAt,
  } as PrismaImport;
  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    let created = 0;
    let page = 0;

    // Get data from 7 days ago
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

    const total = await importService.countImports({ startedAtGte: since });
    let data = await importService.findImports({ startedAtGte: since, size: BATCH_SIZE, skip: page * BATCH_SIZE });
    console.log(`[Imports] Found ${total} docs to sync.`);

    const stored = await prismaClient.import.count();
    console.log(`[Imports] Found ${stored} docs in database.`);
    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    while (data && data.length) {
      const dataToCreate = [];
      for (const doc of data) {
        const obj = buildData(doc as Import, partners);
        if (!obj) {
          continue;
        }
        dataToCreate.push(obj);
      }

      // Create data
      if (dataToCreate.length) {
        console.log(`[Imports] Creating ${dataToCreate.length} docs...`);
        const res = await prismaClient.import.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Imports] Created ${res.count} docs.`);
      }

      page++;
      data = await importService.findImports({ startedAtGte: since, size: BATCH_SIZE, skip: page * BATCH_SIZE });
    }

    console.log(`[Imports] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, "[Imports] Error while syncing docs.");
  }
};

export default handler;
