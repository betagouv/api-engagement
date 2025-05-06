import prisma from "../../db/postgres";
import PublisherModel from "../../models/publisher";
import { captureException } from "../../error";
import { Publisher, OrganizationExclusion } from "../../types";
import { OrganizationExclusion as PgOrganizationExclusion, Partner as PgPartner } from "@prisma/client";
import OrganizationExclusionModel from "../../models/organization-exclusion";
import { an } from "vitest/dist/chunks/reporters.d.CfRkRKN2";

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

    const stored = await prisma.organizationExclusion.findMany({
      include: { excluded_by_publisher: { select: { id: true, old_id: true } }, excluded_for_publisher: { select: { id: true, old_id: true } } },
    });
    console.log(`[OrganizationExclusion] Found ${Object.keys(stored).length} docs in database.`);

    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { old_id: true, id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    let created = 0;
    for (const doc of data) {
      const exists = stored.find(
        (d) =>
          d.excluded_by_publisher.old_id === doc.excludedByPublisherId &&
          d.excluded_for_publisher.old_id === doc.excludedForPublisherId &&
          d.organization_client_id === doc.organizationClientId,
      );
      if (!exists) {
        const obj = buildData(doc, partners);
        if (!obj) continue;
        try {
          await prisma.organizationExclusion.create({ data: obj });
          created++;
        } catch (error: any) {
          // P2002 === unique constraint violation, In case we write a duplicate, we just ignore it.
          if (error.code !== "P2002") throw error;
        }
      }
    }

    let deleted = 0;
    for (const doc of stored) {
      if (
        !data.find(
          (d) =>
            d.excludedByPublisherId === doc.excluded_by_publisher.old_id &&
            d.excludedForPublisherId === doc.excluded_for_publisher.old_id &&
            d.organizationClientId === doc.organization_client_id,
        )
      ) {
        await prisma.organizationExclusion.delete({ where: { id: doc.id } });
        deleted++;
      }
    }

    console.log(`[OrganizationExclusion] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s, created ${created}, deleted ${deleted}`);
    return { created, deleted };
  } catch (error) {
    captureException(error, "[Partners] Error while syncing docs.");
  }
};

export default handler;
