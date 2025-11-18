import { OrganizationExclusion as PgOrganizationExclusion } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import { organizationExclusionRepository } from "../../../repositories/organization-exclusion";

const buildData = (doc: { id: string; excludedByPublisherId: string; excludedForPublisherId: string; organizationClientId: string | null; organizationName: string | null; createdAt: Date; updatedAt: Date }, partners: { [key: string]: string }) => {
  const partnerIdBy = partners[doc.excludedByPublisherId];
  if (!partnerIdBy) {
    console.log(`[OrganizationExclusion] Partner ${doc.excludedByPublisherId} not found for excluded organization ${doc.organizationClientId}`);
    return null;
  }
  const partnerIdFor = partners[doc.excludedForPublisherId];
  if (!partnerIdFor) {
    console.log(`[OrganizationExclusion] Partner ${doc.excludedForPublisherId} not found for excluded organization ${doc.organizationClientId}`);
    return null;
  }

  const obj = {
    old_id: doc.id,
    organization_client_id: doc.organizationClientId ?? "",
    organization_name: doc.organizationName ?? null,
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

    const data = await organizationExclusionRepository.findMany({});
    console.log(`[OrganizationExclusion] Found ${data.length} docs to sync.`);

    const stored = await prismaClient.organizationExclusion.count();
    console.log(`[OrganizationExclusion] Found ${stored} docs in database.`);

    const partners = {} as { [key: string]: string };
    await prismaClient.partner.findMany({ select: { old_id: true, id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const toCreate = [] as PgOrganizationExclusion[];
    for (const doc of data) {
      const obj = buildData(doc, partners);
      if (!obj) {
        continue;
      }
      toCreate.push(obj);
    }

    await prismaClient.organizationExclusion.deleteMany();
    const created = await prismaClient.organizationExclusion.createMany({ data: toCreate });

    console.log(`[OrganizationExclusion] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s, created ${toCreate.length}`);
    return { created: created.count, updated: 0 };
  } catch (error) {
    captureException(error, "[Partners] Error while syncing docs.");
  }
};

export default handler;
