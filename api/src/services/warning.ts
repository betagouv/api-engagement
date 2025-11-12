import { Prisma, Warning as PrismaWarning } from "../db/core";
import { warningRepository } from "../repositories/warning";
import { WarningCreateInput, WarningRecord, WarningUpdatePatch } from "../types/warning";

type WarningWithPublisher = PrismaWarning & {
  publisher: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
};

export const warningService = (() => {
  const toWarningRecord = (warning: PrismaWarning | WarningWithPublisher): WarningRecord => ({
    id: warning.id,
    type: warning.type,
    title: warning.title,
    description: warning.description,
    publisherId: warning.publisherId,
    publisherName: "publisher" in warning && warning.publisher ? warning.publisher.name : null,
    publisherLogo: "publisher" in warning && warning.publisher ? warning.publisher.logo : null,
    seen: warning.seen,
    fixed: warning.fixed,
    fixedAt: warning.fixedAt,
    occurrences: warning.occurrences,
    createdAt: warning.createdAt,
    updatedAt: warning.updatedAt,
  });

  const findOneWarning = async (params: { publisherId: string; type: string; fixed?: boolean }): Promise<WarningRecord | null> => {
    const where: Prisma.WarningWhereInput = {
      publisherId: params.publisherId,
      type: params.type,
      ...(params.fixed !== undefined ? { fixed: params.fixed } : {}),
    };

    const warning = await warningRepository.findFirst({
      where,
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });

    return warning ? toWarningRecord(warning) : null;
  };

  const createWarning = async (input: WarningCreateInput): Promise<WarningRecord> => {
    const created = await warningRepository.create({
      data: {
        type: input.type,
        title: input.title ?? null,
        description: input.description ?? null,
        publisherId: input.publisherId,
        seen: input.seen ?? false,
        fixed: input.fixed ?? false,
        fixedAt: input.fixedAt ?? null,
        occurrences: input.occurrences ?? 1,
      },
    });

    return toWarningRecord(created);
  };

  const updateWarning = async (id: string, patch: WarningUpdatePatch): Promise<WarningRecord> => {
    const updateData: Prisma.WarningUpdateInput = {};

    if (patch.type !== undefined) {
      updateData.type = patch.type;
    }
    if (patch.title !== undefined) {
      updateData.title = patch.title;
    }
    if (patch.description !== undefined) {
      updateData.description = patch.description;
    }
    if (patch.seen !== undefined) {
      updateData.seen = patch.seen;
    }
    if (patch.fixed !== undefined) {
      updateData.fixed = patch.fixed;
    }
    if (patch.fixedAt !== undefined) {
      updateData.fixedAt = patch.fixedAt;
    }
    if (patch.occurrences !== undefined) {
      updateData.occurrences = patch.occurrences;
    }

    const updated = await warningRepository.update({
      where: { id },
      data: updateData,
    });

    return toWarningRecord(updated);
  };

  const findWarnings = async (params: {
    fixed?: boolean;
    publisherId?: string;
    type?: string;
    createdAtGte?: Date;
    createdAtLt?: Date;
    limit?: number;
  }): Promise<WarningRecord[]> => {
    const where: Prisma.WarningWhereInput = {};

    if (params.fixed !== undefined) {
      where.fixed = params.fixed;
    }
    if (params.publisherId) {
      where.publisherId = params.publisherId;
    }
    if (params.type) {
      where.type = params.type;
    }
    if (params.createdAtGte || params.createdAtLt) {
      where.createdAt = {
        ...(params.createdAtGte ? { gte: params.createdAtGte } : {}),
        ...(params.createdAtLt ? { lt: params.createdAtLt } : {}),
      };
    }

    const warnings = await warningRepository.findMany({
      where,
      orderBy: { createdAt: Prisma.SortOrder.desc },
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      ...(params.limit ? { take: params.limit } : {}),
    });

    return warnings.map(toWarningRecord);
  };

  return {
    findOneWarning,
    createWarning,
    updateWarning,
    findWarnings,
  };
})();
