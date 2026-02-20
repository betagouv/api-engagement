import { randomUUID } from "crypto";

import { Prisma } from "@/db/core";
import { importRnaRepository } from "@/repositories/import-rna";
import type { ImportRnaCreateInput, ImportRnaFindParams, ImportRnaRecord, ImportRnaUpdatePatch } from "@/types/import-rna";

export const importRnaService = {
  async findOneImportRna(id: string): Promise<ImportRnaRecord | null> {
    return await importRnaRepository.findById(id);
  },

  async findOneImportRnaByResourceId(resourceId: string): Promise<ImportRnaRecord | null> {
    return await importRnaRepository.findFirst({ where: { resourceId } });
  },

  async findImportRnas(params: ImportRnaFindParams = {}): Promise<ImportRnaRecord[]> {
    const findParams: Prisma.ImportRnaFindManyArgs = {
      where: {
        resourceId: params.resourceId,
        status: params.status ?? undefined,
        year: params.year ?? undefined,
        month: params.month ?? undefined,
      },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    };

    return await importRnaRepository.find(findParams);
  },

  async createImportRna(input: ImportRnaCreateInput): Promise<ImportRnaRecord> {
    const data: Prisma.ImportRnaCreateInput = {
      id: input.id ?? randomUUID(),
      year: input.year ?? undefined,
      month: input.month ?? undefined,
      resourceId: input.resourceId ?? undefined,
      resourceCreatedAt: input.resourceCreatedAt ?? undefined,
      resourceUrl: input.resourceUrl ?? undefined,
      count: input.count ?? undefined,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      status: input.status ?? undefined,
    };

    return await importRnaRepository.create(data);
  },

  async updateImportRna(id: string, patch: ImportRnaUpdatePatch): Promise<ImportRnaRecord> {
    const data: Prisma.ImportRnaUpdateInput = {};

    if ("year" in patch) {
      data.year = patch.year ?? null;
    }
    if ("month" in patch) {
      data.month = patch.month ?? null;
    }
    if ("resourceId" in patch) {
      data.resourceId = patch.resourceId ?? null;
    }
    if ("resourceCreatedAt" in patch) {
      data.resourceCreatedAt = patch.resourceCreatedAt ?? null;
    }
    if ("resourceUrl" in patch) {
      data.resourceUrl = patch.resourceUrl ?? null;
    }
    if ("count" in patch) {
      data.count = patch.count ?? undefined;
    }
    if ("startedAt" in patch) {
      data.startedAt = patch.startedAt ?? undefined;
    }
    if ("endedAt" in patch) {
      data.endedAt = patch.endedAt ?? undefined;
    }
    if ("status" in patch) {
      data.status = patch.status ?? undefined;
    }

    return await importRnaRepository.update(id, data);
  },
};
