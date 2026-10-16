import { Prisma, Warning as PrismaWarning } from "@/db/core";
import { warningRepository } from "@/repositories/warning";
import { WarningCreateInput, WarningFindParams, WarningRecord, WarningStatus, WarningUpdatePatch } from "@/types/warning";

type WarningWithPublisher = PrismaWarning & {
  publisher?: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
  assignees?: { user: { id: string; firstname: string; lastname: string | null } }[];
};

const warningInclude = {
  publisher: { select: { id: true, name: true, logo: true } },
  assignees: { select: { user: { select: { id: true, firstname: true, lastname: true } } } },
} satisfies Prisma.WarningInclude;

export const warningService = (() => {
  const toWarningRecord = (warning: WarningWithPublisher): WarningRecord => ({
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
    status: warning.status,
    procedureUrl: warning.procedureUrl,
    assignees: "assignees" in warning && warning.assignees ? warning.assignees.map(({ user }) => user) : [],
    createdAt: warning.createdAt,
    updatedAt: warning.updatedAt,
  });

  const findOneWarning = async (params: WarningFindParams = {}): Promise<WarningRecord | null> => {
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
        procedureUrl: input.procedureUrl ?? null,
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
    // `fixed` et `status` restent synchronisés : les jobs existants (fixed) et les vues d'alertes (status) coexistent.
    const status: WarningStatus | undefined = patch.status ?? (patch.fixed === undefined ? undefined : patch.fixed ? "RESOLVED" : "TODO");
    if (status !== undefined) {
      updateData.status = status;
      updateData.fixed = status === "RESOLVED";
      updateData.fixedAt = status === "RESOLVED" ? (patch.fixedAt ?? new Date()) : null;
    } else if (patch.fixedAt !== undefined) {
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
      include: warningInclude,
      ...(params.limit ? { take: params.limit } : {}),
    });

    return warnings.map(toWarningRecord);
  };

  const findWarningById = async (id: string): Promise<WarningRecord | null> => {
    const warning = await warningRepository.findUnique({ where: { id }, include: warningInclude });
    return warning ? toWarningRecord(warning) : null;
  };

  // Remplace les assignés et renvoie les utilisateurs nouvellement ajoutés (à notifier).
  const setAssignees = async (id: string, userIds: string[]): Promise<{ warning: WarningRecord; added: string[] }> => {
    const before = await findWarningById(id);
    const previous = new Set(before?.assignees.map((assignee) => assignee.id) ?? []);
    const unique = Array.from(new Set(userIds));

    const updated = await warningRepository.update({
      where: { id },
      data: { assignees: { deleteMany: {}, create: unique.map((userId) => ({ userId })) } },
      include: warningInclude,
    });
    return { warning: toWarningRecord(updated), added: unique.filter((userId) => !previous.has(userId)) };
  };

  return {
    findOneWarning,
    findWarningById,
    createWarning,
    updateWarning,
    findWarnings,
    setAssignees,
  };
})();
