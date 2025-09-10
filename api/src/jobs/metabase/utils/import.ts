import { Import as PrismaImport } from "@prisma/client";
import { prismaAnalytics as prisma } from "../../../db/postgres";
import { captureException } from "../../../error";
import ImportModel from "../../../models/import";
import { Import } from "../../../types";

const BATCH_SIZE = 5000;

const buildData = (doc: Import, partners: { [key: string]: string }) => {
  const partnerId = partners[doc.publisherId.toString()];
  if (!partnerId) {
    console.log(`[Imports] Patner ${doc.publisherId.toString()} not found for doc ${doc._id?.toString()}`);
    return null;
  }
  const obj = {
    old_id: doc._id.toString(),
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
    const where = { startedAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } };

    const total = await ImportModel.countDocuments(where);
    let data = await ImportModel.find(where)
      .limit(BATCH_SIZE)
      .skip(page * BATCH_SIZE)
      .lean();
    console.log(`[Imports] Found ${total} docs to sync.`);

    const stored = await prisma.import.count();
    console.log(`[Imports] Found ${stored} docs in database.`);
    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

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
        const res = await prisma.import.createMany({ data: dataToCreate, skipDuplicates: true });
        created += res.count;
        console.log(`[Imports] Created ${res.count} docs.`);
      }

      page++;
      data = await ImportModel.find(where)
        .limit(BATCH_SIZE)
        .skip(page * BATCH_SIZE)
        .lean();
    }

    console.log(`[Imports] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created };
  } catch (error) {
    captureException(error, "[Imports] Error while syncing docs.");
  }
};

export default handler;
