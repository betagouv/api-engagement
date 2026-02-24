import { Prisma, Import as PrismaImport } from "@/db/core";
import { importRepository } from "@/repositories/import";
import { ImportCreateInput, ImportFindParams, ImportRecord, ImportStateSummary, ImportUpdatePatch } from "@/types";

export const importService = (() => {
  const toImportRecord = (data: PrismaImport & { publisher?: { name: string; logo: string } }): ImportRecord => {
    return {
      id: data.id,
      name: data.name,
      publisherId: data.publisherId,
      publisherName: data.publisher?.name,
      publisherLogo: data.publisher?.logo,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      status: data.status,
      missionCount: data.missionCount,
      refusedCount: data.refusedCount,
      createdCount: data.createdCount,
      deletedCount: data.deletedCount,
      updatedCount: data.updatedCount,
      error: data.error,
      failed: data.failed,
    };
  };

  const buildWhereClause = (params: ImportFindParams = {}): Prisma.ImportWhereInput => {
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

  const countImports = async (params: ImportFindParams = {}): Promise<number> => {
    const where = buildWhereClause(params);
    return importRepository.count({ where });
  };

  const findImports = async (params: ImportFindParams = {}): Promise<ImportRecord[]> => {
    const where = buildWhereClause(params);
    const data = await importRepository.findMany({
      where,
      include: { publisher: { select: { name: true, logo: true } } },
      orderBy: { startedAt: Prisma.SortOrder.desc },
      skip: params.skip ?? 0,
      take: params.size ?? 25,
    });
    return data.map(toImportRecord);
  };

  const findImportsWithCount = async (params: ImportFindParams = {}): Promise<{ data: ImportRecord[]; total: number }> => {
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
    const data = await importRepository.findMany({
      where,
      orderBy: { startedAt: "desc" },
      distinct: ["publisherId"],
      include: { publisher: true },
    });
    return data.map(toImportRecord);
  };

  const findOneImportById = async (id: string): Promise<ImportRecord | null> => {
    const doc = await importRepository.findUnique({ where: { id }, include: { publisher: { select: { name: true, logo: true } } } });
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

  const getLastImportSummary = async (): Promise<ImportStateSummary> => {
    const summary = await importRepository.getLastImportSummary();
    return {
      imports: summary.total,
      success: summary.success,
      last: summary.last,
    };
  };

  return {
    countImports,
    findImports,
    findImportsWithCount,
    findLastImportsPerPublisher,
    findOneImportById,
    createImport,
    updateImport,
    getLastImportSummary,
  };
})();
