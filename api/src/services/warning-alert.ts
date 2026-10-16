import { ALERTS_BREVO_TEMPLATE_ID, ALERTS_ESCALATION_HOURS } from "@/config";
import { sendTemplate } from "@/services/brevo/email";
import { publisherService } from "@/services/publisher";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import type { WarningRecord } from "@/types/warning";

// Identifiant de l'alerte dans l'objet du mail : permet de relier une réponse (Brevo inbound) à l'alerte.
const SUBJECT_TAG = /\[ALERTE:([0-9a-f-]{36})\]/i;

export interface AlertInput {
  type: string;
  publisherId: string;
  title?: string;
  description?: string;
  procedureUrl?: string;
}

export const warningAlertService = (() => {
  // Envoie le mail d'alerte aux utilisateurs donnés. Les emails ne quittent jamais l'API.
  const notifyUsers = async (warning: WarningRecord, userIds: string[], options: { reminder?: boolean } = {}): Promise<number> => {
    if (!ALERTS_BREVO_TEMPLATE_ID) {
      console.warn("[warning-alert] ALERTS_BREVO_TEMPLATE_ID is not set, no email sent");
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
        subject: `${options.reminder ? "[Relance] " : ""}[Alerte] ${warning.publisherName ?? "Annonceur"} : ${warning.title ?? warning.type} [ALERTE:${warning.id}]`,
        params: {
          firstname: user.firstname,
          publisherName: warning.publisherName,
          title: warning.title,
          description: warning.description,
          triggeredAt: warning.createdAt.toISOString(),
          procedureUrl: warning.procedureUrl,
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

    const open = await warningService.findOneWarning({ publisherId: input.publisherId, type: input.type, fixed: false });
    if (open) {
      const updated = await warningService.updateWarning(open.id, {
        occurrences: open.occurrences + 1,
        ...(input.title ? { title: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
      });
      return { warning: updated, created: false };
    }

    const created = await warningService.createWarning({
      type: input.type,
      title: input.title,
      description: input.description,
      publisherId: input.publisherId,
      procedureUrl: input.procedureUrl,
    });
    const assigneeIds = publisher.deploymentUserId ? [publisher.deploymentUserId] : [];
    const { warning } = await warningService.setAssignees(created.id, assigneeIds);
    await notifyUsers(warning, assigneeIds);
    return { warning, created: true };
  };

  const assign = async (id: string, userIds: string[]): Promise<WarningRecord | null> => {
    if (!(await warningService.findWarningById(id))) {
      return null;
    }
    const { warning, added } = await warningService.setAssignees(id, userIds);
    await notifyUsers(warning, added);
    return warning;
  };

  // Une réponse d'un assigné (ou d'un admin) au mail d'alerte marque l'alerte comme résolue.
  const handleEmailReply = async (subject: string, fromEmail: string): Promise<boolean> => {
    const id = SUBJECT_TAG.exec(subject)?.[1];
    if (!id) {
      return false;
    }
    const warning = await warningService.findWarningById(id);
    const sender = await userService.findUserByEmail(fromEmail);
    if (!warning || !sender || (sender.role !== "admin" && !warning.assignees.some((assignee) => assignee.id === sender.id))) {
      return false;
    }
    if (warning.status !== "RESOLVED") {
      await warningService.updateWarning(id, { status: "RESOLVED" });
    }
    return true;
  };

  // Relance une fois les alertes restées "à faire" au-delà du délai (les alertes en cours ou résolues sont ignorées).
  const escalate = async (olderThanHours = ALERTS_ESCALATION_HOURS): Promise<number> => {
    const stale = await warningService.findWarnings({
      status: "TODO",
      escalated: false,
      createdAtLt: new Date(Date.now() - olderThanHours * 60 * 60 * 1000),
    });
    for (const warning of stale) {
      await notifyUsers(
        warning,
        warning.assignees.map((assignee) => assignee.id),
        { reminder: true }
      );
      await warningService.updateWarning(warning.id, { escalatedAt: new Date() });
    }
    return stale.length;
  };

  return { ingest, assign, notifyUsers, escalate, handleEmailReply };
})();
