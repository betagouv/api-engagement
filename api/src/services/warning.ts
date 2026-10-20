import { ALERTS_BREVO_TEMPLATE_ID, APP_URL } from "@/config";
import { Prisma, Warning as PrismaWarning } from "@/db/core";
import { warningRepository } from "@/repositories/warning";
import type { AlertInput } from "@/services/alerts/types";
import { sendTemplate } from "@/services/brevo/email";
import { publisherService } from "@/services/publisher";
import { userService } from "@/services/user";
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

const formatDate = (date: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);

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

  // Envoie le mail d'alerte aux utilisateurs donnés. Les emails ne quittent jamais l'API.
  // Template Brevo (ALERTS_BREVO_TEMPLATE_ID) géré dans Brevo ; params : firstname, publisherName, title, description,
  // triggeredAtLabel, procedureUrl?, occurrences, alertsUrl. L'objet est défini ici.
  const notifyUsers = async (warning: WarningRecord, userIds: string[]): Promise<number> => {
    if (!ALERTS_BREVO_TEMPLATE_ID) {
      console.warn("[warning] ALERTS_BREVO_TEMPLATE_ID is not set, no email sent");
      return 0;
    }
    let sent = 0;
    for (const userId of userIds) {
      const user = await userService.findUserById(userId);
      if (!user) {
        continue;
      }
      const { ok } = await sendTemplate(ALERTS_BREVO_TEMPLATE_ID, {
        emailTo: [user.email],
        subject: `[Alerte] ${warning.publisherName ?? "Annonceur"} : ${warning.title ?? warning.type}`,
        params: {
          firstname: user.firstname,
          publisherName: warning.publisherName,
          title: warning.title,
          description: warning.description,
          triggeredAt: warning.createdAt.toISOString(),
          triggeredAtLabel: formatDate(warning.createdAt),
          procedureUrl: warning.procedureUrl,
          occurrences: warning.occurrences,
          alertsUrl: `${APP_URL}/admin-warning`,
        },
      });
      if (ok) {
        sent++;
      }
    }
    return sent;
  };

  // Crée l'alerte (ou incrémente l'alerte ouverte du même type) et notifie le chargé de déploiement à la création.
  const ingest = async (input: AlertInput): Promise<{ warning: WarningRecord; created: boolean } | null> => {
    const publisher = await publisherService.findOnePublisherById(input.publisherId);
    if (!publisher) {
      return null;
    }

    const open = await findOneWarning({ publisherId: input.publisherId, type: input.type, fixed: false });
    if (open) {
      const updated = await updateWarning(open.id, {
        occurrences: open.occurrences + 1,
        ...(input.title ? { title: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
      });
      return { warning: updated, created: false };
    }

    const assigneeIds = publisher.deploymentUserId ? [publisher.deploymentUserId] : [];
    const warning = await createWarning({
      type: input.type,
      title: input.title,
      description: input.description,
      publisherId: input.publisherId,
      procedureUrl: input.procedureUrl,
      assigneeIds,
    });
    if (!assigneeIds.length) {
      console.warn(`[warning] alert ${warning.id} created without deployment user (publisher ${warning.publisherId}), nobody notified`);
    }
    await notifyUsers(warning, assigneeIds);
    return { warning, created: true };
  };

  // Ingère un lot d'alertes et résume le résultat. `unassigned` : alertes créées sans personne à notifier
  // (annonceur sans chargé de déploiement).
  const ingestMany = async (alerts: AlertInput[]) => {
    let created = 0;
    let updated = 0;
    const unknownPublishers: string[] = [];
    const unassigned: { publisherId: string; publisherName: string | null }[] = [];
    for (const alert of alerts) {
      const result = await ingest(alert);
      if (!result) {
        unknownPublishers.push(alert.publisherId);
      } else if (result.created) {
        created++;
        if (!result.warning.assignees.length) {
          unassigned.push({ publisherId: result.warning.publisherId, publisherName: result.warning.publisherName });
        }
      } else {
        updated++;
      }
    }
    return { created, updated, unknownPublishers, unassigned };
  };

  return {
    findOneWarning,
    createWarning,
    updateWarning,
    findWarnings,
    ingest,
    ingestMany,
  };
})();
