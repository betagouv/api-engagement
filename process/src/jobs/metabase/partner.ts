import prisma from "../../db/postgres";
import PublisherModel from "../../models/publisher";
import { captureException } from "../../error";
import { Publisher } from "../../types";
import { OrganizationExclusion, Partner as PgPartner } from "@prisma/client";

const buildData = (doc: Publisher) => {
  const obj = {
    old_id: doc._id.toString(),
    name: doc.name,
    diffuseur_api: doc.api,
    diffuseur_widget: doc.widget,
    diffuseur_campaign: doc.campaign,
    annonceur: doc.annonceur,
    partners: doc.publishers.map((p) => p.publisherId),
    created_at: new Date(doc.createdAt),
    updated_at: new Date(doc.updatedAt),
    deleted_at: doc.deletedAt ? new Date(doc.deletedAt) : null,
  } as PgPartner;

  return obj;
};

const buildExcludedOrganizations = (doc: Publisher, partnerForId: string, partners: { [key: string]: { old_id: string; id: string; updated_at: Date } }) => {
  const excludedOrganizations = doc.excludedOrganizations
    .map((e) => {
      if (!e._id) {
        console.log(`[Partners] Excluded organization ${e.organizationClientId} has no _id`);
        return null;
      }
      const partnerBy = partners[e.publisherId.toString()];
      if (!partnerBy) {
        console.log(`[Partners] Partner ${e.publisherId.toString()} not found for excluded organization ${e.organizationClientId}`);
        return null;
      }
      return {
        old_id: e._id.toString(),
        organization_client_id: e.organizationClientId,
        organization_name: e.organizationName,
        excluded_by_publisher_id: partnerBy.id,
        excluded_for_publisher_id: partnerForId,
        created_at: new Date(e.createdAt),
        updated_at: new Date(e.updatedAt),
      } as OrganizationExclusion;
    })
    .filter((e) => e !== null);

  return excludedOrganizations;
};

const isDateEqual = (a: Date, b: Date) => new Date(a).getTime() === new Date(b).getTime();

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Partners] Starting at ${start.toISOString()}`);

    const data = await PublisherModel.find().lean();
    console.log(`[Partners] Found ${data.length} docs to sync.`);

    const stored = {} as { [key: string]: { old_id: string; id: string; updated_at: Date } };
    await prisma.partner.findMany({ select: { old_id: true, id: true, updated_at: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Partners] Found ${Object.keys(stored).length} docs in database.`);

    let created = 0;
    let updated = 0;
    let processed = 0;
    for (const doc of data) {
      if (processed % 10 === 0) console.log(`[Partners] Processed ${processed}/${data.length} docs, created ${created}, updated ${updated}`);

      const exists = stored[doc._id.toString()];
      const obj = buildData(doc as Publisher);
      if (!exists) {
        const res = await prisma.partner.create({ data: obj });
        created++;
        stored[res.old_id] = { old_id: res.old_id, id: res.id, updated_at: res.updated_at };
        const organizationExclusions = buildExcludedOrganizations(doc as Publisher, res.id, stored);
        // console.log("create organizationExclusions", organizationExclusions);
        if (organizationExclusions.length) {
          await prisma.organizationExclusion.createMany({ data: organizationExclusions, skipDuplicates: true });
        }
      } else if (!isDateEqual(exists.updated_at, obj.updated_at)) {
        await prisma.partner.update({ where: { old_id: obj.old_id }, data: obj });
        updated++;
        const organizationExclusions = buildExcludedOrganizations(doc as Publisher, exists.id, stored);
        if (processed < 10) {
          console.log("update organizationExclusions", organizationExclusions);
        }
        if (organizationExclusions.length) {
          await prisma.organizationExclusion.deleteMany({ where: { excluded_for_publisher_id: exists.id } });
          await prisma.organizationExclusion.createMany({ data: organizationExclusions, skipDuplicates: true });
        }
      }
      processed++;
    }

    console.log(`[Partners] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s, created ${created}, updated ${updated}, processed ${processed}`);
    return { created, updated, processed };
  } catch (error) {
    captureException(error, "[Partners] Error while syncing docs.");
  }
};

export default handler;
