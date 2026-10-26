import { Prisma, Warning as PrismaWarning } from "@/db/core";
import { warningRepository } from "@/repositories/warning";
import { WarningCreateInput, WarningFindParams, WarningRecord, WarningStatus, WarningUpdatePatch } from "@/types/warning";

type WarningWithPublisher = PrismaWarning & {
  publisher?: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
  assignees?: { user: { id: string; firstname: string; lastname: string | null; photo: string | null } }[];
};

const warningInclude = {
  publisher: { select: { id: true, name: true, logo: true } },
  assignees: { select: { user: { select: { id: true, firstname: true, lastname: true, photo: true } } } },
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
    notifiedAt: warning.notifiedAt,
    slackChannelId: warning.slackChannelId,
    slackMessageTs: warning.slackMessageTs,
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

  // `fixed` (déprécié) est dérivé de `status` ; un appelant historique peut encore passer `fixed`.
  const toStatus = (input: { status?: WarningStatus; fixed?: boolean }): WarningStatus | undefined =>
    input.status ?? (input.fixed === undefined ? undefined : input.fixed ? "RESOLVED" : "TODO");

  const createWarning = async (input: WarningCreateInput): Promise<WarningRecord> => {
    const status = toStatus(input) ?? "TODO";
    const created = await warningRepository.create({
      data: {
        type: input.type,
        title: input.title ?? null,
        description: input.description ?? null,
        publisherId: input.publisherId,
        seen: input.seen ?? false,
        status,
        fixed: status === "RESOLVED",
        fixedAt: status === "RESOLVED" ? (input.fixedAt ?? new Date()) : null,
        occurrences: input.occurrences ?? 1,
        procedureUrl: input.procedureUrl ?? null,
        assignees: { create: (input.assigneeIds ?? []).map((userId) => ({ userId })) },
      },
      include: warningInclude,
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
    if (patch.procedureUrl !== undefined) {
      updateData.procedureUrl = patch.procedureUrl;
    }
    if (patch.seen !== undefined) {
      updateData.seen = patch.seen;
    }
    const status = toStatus(patch);
    if (status !== undefined) {
      updateData.status = status;
      updateData.fixed = status === "RESOLVED";
      updateData.fixedAt = status === "RESOLVED" ? (patch.fixedAt ?? new Date()) : null;
    } else if (patch.fixedAt !== undefined) {
      updateData.fixedAt = patch.fixedAt;
    }
    if (patch.occurrencesIncrement !== undefined) {
      updateData.occurrences = { increment: patch.occurrencesIncrement };
    } else if (patch.occurrences !== undefined) {
      updateData.occurrences = patch.occurrences;
    }
    if (patch.slackMessage) {
      updateData.slackChannelId = patch.slackMessage.channelId;
      updateData.slackMessageTs = patch.slackMessage.ts;
    }
    if (patch.assigneeIds?.length) {
      updateData.assignees = { createMany: { data: patch.assigneeIds.map((userId) => ({ userId })), skipDuplicates: true } };
    }

    const updated = await warningRepository.update({
      where: { id },
      data: updateData,
      include: warningInclude,
    });

    return toWarningRecord(updated);
  };

  const buildWhere = (params: WarningFindParams): Prisma.WarningWhereInput => {
    const where: Prisma.WarningWhereInput = {};

    if (params.fixed !== undefined) {
      where.fixed = params.fixed;
    }
    if (params.status) {
      where.status = params.status;
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
    return where;
  };

  const findWarnings = async (params: WarningFindParams): Promise<WarningRecord[]> => {
    const warnings = await warningRepository.findMany({
      where: buildWhere(params),
      orderBy: { createdAt: Prisma.SortOrder.desc },
      include: warningInclude,
      ...(params.limit ? { take: params.limit } : {}),
      ...(params.skip ? { skip: params.skip } : {}),
    });

    return warnings.map(toWarningRecord);
  };

  const countWarnings = (params: WarningFindParams): Promise<number> => warningRepository.count({ where: buildWhere(params) });

  const findWarningById = async (id: string): Promise<WarningRecord | null> => {
    const warning = await warningRepository.findUnique({ where: { id }, include: warningInclude });
    return warning ? toWarningRecord(warning) : null;
  };

  // Change le statut seulement si l'alerte est encore dans l'un des statuts `from` (atomique : un clic périmé ou concurrent n'écrase rien).
  const transitionStatus = async (id: string, from: WarningStatus[], to: WarningStatus): Promise<boolean> => {
    const { count } = await warningRepository.updateMany({
      where: { id, status: { in: from } },
      data: { status: to, fixed: to === "RESOLVED", fixedAt: to === "RESOLVED" ? new Date() : null },
    });
    return count === 1;
  };

  // Réserve la notification (null -> now) : un seul appelant l'obtient, même en concurrence.
  const claimNotification = async (id: string): Promise<boolean> => {
    const { count } = await warningRepository.updateMany({ where: { id, notifiedAt: null }, data: { notifiedAt: new Date() } });
    return count === 1;
  };

  // Libère la réservation (envoi échoué) pour qu'un prochain passage réessaie.
  const releaseNotification = async (id: string): Promise<void> => {
    await warningRepository.updateMany({ where: { id }, data: { notifiedAt: null } });
  };

  return {
    findOneWarning,
    createWarning,
    updateWarning,
    findWarnings,
    countWarnings,
    findWarningById,
    transitionStatus,
    claimNotification,
    releaseNotification,
  };
})();
