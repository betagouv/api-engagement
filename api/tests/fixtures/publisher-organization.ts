import { randomUUID } from "node:crypto";

import type { PublisherOrganization } from "@/db/core";
import { prisma } from "@/db/postgres";

export const createTestPublisherOrganization = async (
  data: { publisherId: string; clientId: string; name?: string | null } & Partial<Pick<PublisherOrganization, "rna" | "siren" | "siret">>
): Promise<PublisherOrganization> => {
  const publisherId = data.publisherId;
  const clientId = data.clientId ?? `org-${randomUUID().slice(0, 8)}`;
  const name = data.name ?? `Test Organization ${clientId}`;

  return prisma.publisherOrganization.upsert({
    where: {
      publisherId_clientId: { publisherId, clientId },
    },
    create: {
      publisherId,
      clientId,
      name,
      rna: data.rna ?? null,
      siren: data.siren ?? null,
      siret: data.siret ?? null,
    },
    update: { name },
  });
};
