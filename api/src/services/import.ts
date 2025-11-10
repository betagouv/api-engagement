import { Prisma, Import as PrismaImport } from "../db/core";
import { importRepository } from "../repositories/import";
import { ImportCreateInput, ImportRecord, ImportSearchParams, ImportUpdatePatch } from "../types/import";

export const importService = (() => {
  const toImportRecord = (value: PrismaImport): ImportRecord => ({
    _id: value.id,
    id: value.id,
    name: value.name,
    publisherId: value.publisherId,
    missionCount: value.missionCount,
    refusedCount: value.refusedCount,
    createdCount: value.createdCount,
    deletedCount: value.deletedCount,
    updatedCount: value.updatedCount,
    startedAt: value.startedAt ?? null,
    finishedAt: value.finishedAt ?? null,
    status: value.status,
    error: value.error ?? null,
    failed: value.failed ?? [],
  });

  const buildWhereClause = (params: ImportSearchParams = {}): Prisma.ImportWhereInput => {
    const and: Prisma.ImportWhereInput[] = [];

    if (params.publisherId) {
      and.push({ publisherId: params.publisherId });
    }
    if (params.publisherIds && params.publisherIds.length) {
      and.push({ publisherId: { in: params.publisherIds } });
    }
    if (params.status) {
      and.push({ status: params.status });
    }
    if (params.startedAtGte || params.startedAtLt) {
      and.push({
        startedAt: {
          ...(params.startedAtGte ? { gte: params.startedAtGte } : {}),
          ...(params.startedAtLt ? { lt: params.startedAtLt } : {}),
        },
      });
    }
    if (params.finishedAtGt || params.finishedAtGte) {
      and.push({
        finishedAt: {
          ...(params.finishedAtGt ? { gt: params.finishedAtGt } : {}),
          ...(params.finishedAtGte ? { gte: params.finishedAtGte } : {}),
        },
      });
    }

    return and.length ? { AND: and } : {};
  };

  const countImports = async (params: ImportSearchParams = {}): Promise<number> => {
    const where = buildWhereClause(params);
    return importRepository.count({ where });
  };

  const findImports = async (params: ImportSearchParams = {}): Promise<ImportRecord[]> => {
    const where = buildWhereClause(params);
    const data = await importRepository.findMany({
      where,
      orderBy: { startedAt: Prisma.SortOrder.desc },
      skip: params.skip ?? 0,
      take: params.size ?? 25,
    });
    return data.map(toImportRecord);
  };

  const findImportsWithCount = async (params: ImportSearchParams = {}): Promise<{ data: ImportRecord[]; total: number }> => {
    const where = buildWhereClause(params);

    const [data, total] = await Promise.all([
      importRepository.findMany({
        where,
        orderBy: { startedAt: Prisma.SortOrder.desc },
        skip: params.skip ?? 0,
        take: params.size ?? 25,
      }),
      importRepository.count({ where }),
    ]);
    return { data: data.map(toImportRecord), total };
  };

  const findLastImportsPerPublisher = async (params: { publisherId?: string } = {}): Promise<ImportRecord[]> => {
    const where = buildWhereClause(params);
    const data = await importRepository.findLastPerPublisher({ where });
    return data.map(toImportRecord);
  };

  const findOneImportById = async (id: string): Promise<ImportRecord | null> => {
    const doc = await importRepository.findUnique({ where: { id } });
    return doc ? toImportRecord(doc) : null;
  };

  const createImport = async (input: ImportCreateInput): Promise<ImportRecord> => {
    const created = await importRepository.create({
      data: {
        name: input.name,
        publisherId: input.publisherId,
        startedAt: input.startedAt ?? new Date(),
        finishedAt: input.finishedAt ?? null,
        status: (input.status as PrismaImport["status"]) ?? "SUCCESS",
        missionCount: input.missionCount ?? 0,
        refusedCount: input.refusedCount ?? 0,
        createdCount: input.createdCount ?? 0,
        deletedCount: input.deletedCount ?? 0,
        updatedCount: input.updatedCount ?? 0,
        error: input.error ?? null,
        failed: input.failed ?? [],
      },
    });
    return toImportRecord(created);
  };

  const updateImport = async (id: string, patch: ImportUpdatePatch): Promise<ImportRecord> => {
    const updated = await importRepository.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
        ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
        ...(patch.status !== undefined ? { status: patch.status as PrismaImport["status"] } : {}),
        ...(patch.missionCount !== undefined ? { missionCount: patch.missionCount } : {}),
        ...(patch.refusedCount !== undefined ? { refusedCount: patch.refusedCount } : {}),
        ...(patch.createdCount !== undefined ? { createdCount: patch.createdCount } : {}),
        ...(patch.deletedCount !== undefined ? { deletedCount: patch.deletedCount } : {}),
        ...(patch.updatedCount !== undefined ? { updatedCount: patch.updatedCount } : {}),
        ...(patch.error !== undefined ? { error: patch.error } : {}),
        ...(patch.failed !== undefined ? { failed: patch.failed as unknown as Prisma.InputJsonValue } : {}),
      },
    });
    return toImportRecord(updated);
  };

  return {
    countImports,
    findImports,
    findImportsWithCount,
    findLastImportsPerPublisher,
    findOneImportById,
    createImport,
    updateImport,
  };
})();
