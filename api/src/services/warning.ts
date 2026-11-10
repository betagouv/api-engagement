import { WARNING_IGNORE_DELAY_DAYS } from "@/config";
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

const ignoreUntil = (from: Date): Date => new Date(from.getTime() + WARNING_IGNORE_DELAY_DAYS * 24 * 60 * 60 * 1000);

// Ligne de trace ajoutée aux commentaires lors d'un passage en « Ignorée » ou « Résolue », suivie du commentaire saisi.
const TRACE_LABELS: Partial<Record<WarningStatus, string>> = { IGNORED: "ignorée", RESOLVED: "résolue" };

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
    resolvedAt: warning.resolvedAt,
    ignoredAt: warning.ignoredAt,
    ignoreUntil: ignoreUntil(warning.ignoredAt ?? new Date()),
    occurrences: warning.occurrences,
    status: warning.status,
    procedureUrl: warning.procedureUrl,
    itemId: warning.itemId,
    itemLabel: warning.itemLabel,
    notifiedAt: warning.notifiedAt,
    slackChannelId: warning.slackChannelId,
    slackMessageTs: warning.slackMessageTs,
    assignees: "assignees" in warning && warning.assignees ? warning.assignees.map(({ user }) => user) : [],
    createdAt: warning.createdAt,
    updatedAt: warning.updatedAt,
  });

  const findOneWarning = async (params: WarningFindParams = {}): Promise<WarningRecord | null> => {
    const warning = await warningRepository.findFirst({
      where: buildWhere(params),
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });

    return warning ? toWarningRecord(warning) : null;
  };

  const createWarning = async (input: WarningCreateInput): Promise<WarningRecord> => {
    const status = input.status ?? "TODO";
    const created = await warningRepository.create({
      data: {
        type: input.type,
        title: input.title ?? null,
        description: input.description ?? null,
        publisherId: input.publisherId,
        seen: input.seen ?? false,
        status,
        resolvedAt: status === "RESOLVED" ? (input.resolvedAt ?? new Date()) : null,
        occurrences: input.occurrences ?? 1,
        procedureUrl: input.procedureUrl ?? null,
        itemId: input.itemId ?? null,
        itemLabel: input.itemLabel ?? null,
        assignees: { create: (input.assigneeIds ?? []).map((userId) => ({ userId })) },
        ...(input.source ? { receptions: { create: { source: input.source, title: input.title ?? null, description: input.description ?? null } } } : {}),
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
    if (patch.itemLabel !== undefined) {
      updateData.itemLabel = patch.itemLabel;
    }
    if (patch.seen !== undefined) {
      updateData.seen = patch.seen;
    }
    const status = patch.status;
    if (status !== undefined) {
      updateData.status = status;
      updateData.resolvedAt = status === "RESOLVED" ? (patch.resolvedAt ?? new Date()) : null;
      updateData.ignoredAt = status === "IGNORED" ? new Date() : null;
    } else if (patch.resolvedAt !== undefined) {
      updateData.resolvedAt = patch.resolvedAt;
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
    if (patch.comment) {
      updateData.comments = { create: patch.comment };
    }
    if (patch.assigneeIds?.length) {
      updateData.assignees = { createMany: { data: patch.assigneeIds.map((userId) => ({ userId })), skipDuplicates: true } };
    }

    if (patch.source && (patch.occurrencesIncrement !== undefined || patch.occurrences !== undefined)) {
      updateData.receptions = { create: { source: patch.source, title: patch.title ?? null, description: patch.description ?? null } };
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

    // `open` : non résolue ; `status` (valeur ou liste) est prioritaire.
    if (params.status) {
      where.status = Array.isArray(params.status) ? { in: params.status } : params.status;
    } else if (params.open) {
      where.status = { not: "RESOLVED" };
    }
    if (params.publisherId) {
      where.publisherId = params.publisherId;
    }
    if (params.type) {
      where.type = params.type;
    }
    if (params.itemId !== undefined) {
      where.itemId = params.itemId;
    }
    if (params.unassigned) {
      where.assignees = { none: {} };
    } else if (params.assigneeId) {
      where.assignees = { some: { userId: params.assigneeId } };
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
      data: { status: to, resolvedAt: to === "RESOLVED" ? new Date() : null, ignoredAt: to === "IGNORED" ? new Date() : null },
    });
    return count === 1;
  };

  // Change le statut depuis le back-office : pour « Ignorée » et « Résolue », une ligne de trace (+ le commentaire saisi) est ajoutée aux commentaires, dans la même écriture.
  const setStatus = (id: string, status: WarningStatus, author: { id: string }, comment?: string): Promise<WarningRecord> => {
    const label = TRACE_LABELS[status];
    const body = label ? [`L'alerte a été passée en statut "${label}"`, comment].filter(Boolean).join("\n") : null;
    return updateWarning(id, { status, ...(body ? { comment: { authorId: author.id, body } } : {}) });
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
    setStatus,
    claimNotification,
    releaseNotification,
  };
})();
