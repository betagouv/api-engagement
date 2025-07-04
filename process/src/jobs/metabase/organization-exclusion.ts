import { OrganizationExclusion as PgOrganizationExclusion } from "@prisma/client";
import prisma from "../../db/postgres";
import { captureException } from "../../error";
import OrganizationExclusionModel from "../../models/organization-exclusion";
import { OrganizationExclusion } from "../../types";

const buildData = (doc: OrganizationExclusion, partners: { [key: string]: string }) => {
  const partnerIdBy = partners[doc.excludedByPublisherId.toString()];
  if (!partnerIdBy) {
    console.log(`[OrganizationExclusion] Partner ${doc.excludedByPublisherId.toString()} not found for excluded organization ${doc.organizationClientId}`);
    return null;
  }
  const partnerIdFor = partners[doc.excludedForPublisherId.toString()];
  if (!partnerIdFor) {
    console.log(`[OrganizationExclusion] Partner ${doc.excludedForPublisherId.toString()} not found for excluded organization ${doc.organizationClientId}`);
    return null;
  }

  const obj = {
    old_id: doc._id?.toString(),
    organization_client_id: doc.organizationClientId,
    organization_name: doc.organizationName,
    excluded_by_publisher_id: partnerIdBy,
    excluded_for_publisher_id: partnerIdFor,
    created_at: new Date(doc.createdAt),
    updated_at: new Date(doc.updatedAt),
  } as PgOrganizationExclusion;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[OrganizationExclusion] Starting at ${start.toISOString()}`);

    const data = await OrganizationExclusionModel.find().lean();
    console.log(`[OrganizationExclusion] Found ${data.length} docs to sync.`);

    const stored = await prisma.organizationExclusion.count();
    console.log(`[OrganizationExclusion] Found ${stored} docs in database.`);

    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { old_id: true, id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const toCreate = [] as PgOrganizationExclusion[];
    for (const doc of data) {
      const obj = buildData(doc, partners);
      if (!obj) {
        continue;
      }
      toCreate.push(obj);
    }

    await prisma.organizationExclusion.deleteMany({ where: { id: "329f8e65-d3a1-423a-b611-cf3dcf39b915" } });
    const created = await prisma.organizationExclusion.createMany({ data: toCreate });

    console.log(`[OrganizationExclusion] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s, created ${toCreate.length}`);
    return { created: created.count };
  } catch (error) {
    captureException(error, "[Partners] Error while syncing docs.");
  }
};

export default handler;
