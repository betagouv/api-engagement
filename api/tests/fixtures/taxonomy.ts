import { randomUUID } from "node:crypto";

import { Taxonomy, TaxonomyKey, TaxonomyType, TaxonomyValue } from "@/db/core";
import { prisma } from "@/db/postgres";

export const createTestTaxonomy = async (data: Partial<{ key: TaxonomyKey; label: string; type: TaxonomyType }> = {}): Promise<Taxonomy> => {
  const suffix = randomUUID().slice(0, 8);
  const key = data.key ?? TaxonomyKey.domaine;

  return prisma.taxonomy.upsert({
    where: { key },
    update: {},
    create: {
      key,
      label: data.label ?? `Taxonomy ${suffix}`,
      type: data.type ?? "multi_value",
    },
  });
};

export const createTestTaxonomyValue = async (data: Partial<{ taxonomyId: string; key: string; label: string; active: boolean }> = {}): Promise<TaxonomyValue> => {
  const taxonomyId = data.taxonomyId ?? (await createTestTaxonomy()).id;
  const suffix = randomUUID().slice(0, 8);
  return prisma.taxonomyValue.create({
    data: {
      taxonomyId,
      key: data.key ?? `value_${suffix}`,
      label: data.label ?? `Value ${suffix}`,
      active: data.active ?? true,
    },
  });
};
