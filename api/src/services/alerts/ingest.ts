import { captureException } from "@/error";
import { mailNotifier } from "@/services/alerts/notifiers/mail";
import { slackNotifier } from "@/services/alerts/notifiers/slack";
import type { AlertNotifier } from "@/services/alerts/notifiers/types";
import type { AlertInput } from "@/services/alerts/types";
import { publisherService } from "@/services/publisher";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import type { UserRecord } from "@/types/user";
import type { WarningRecord } from "@/types/warning";
import { isUniqueViolation } from "@/utils/prisma";

// Mail en premier (il pilote le verrou), puis les canaux best-effort (Slack).
const NOTIFIERS = [mailNotifier, slackNotifier];

const runNotifier = async (notifier: AlertNotifier, warning: WarningRecord, users: UserRecord[]) => {
  try {
    return await notifier.notify(warning, users);
  } catch (error) {
    captureException(error, { extra: { warningId: warning.id, notifier: notifier.name } });
    return false;
  }
};

type Notification = "sent" | "failed" | "unassigned" | "already";

// Notifie les assignés d'une alerte pas encore notifiée (`notifiedAt` nul). Une alerte sans assigné reçoit le chargé de
// déploiement actuel de l'annonceur s'il existe. En cas d'échec d'envoi, la réservation est libérée : le prochain webhook réessaie.
const ensureNotified = async (warning: WarningRecord, deploymentUserId: string | null): Promise<{ warning: WarningRecord; notification: Notification }> => {
  if (warning.notifiedAt) {
    return { warning, notification: "already" };
  }
  if (!warning.assignees.length && deploymentUserId) {
    warning = await warningService.updateWarning(warning.id, { assigneeIds: [deploymentUserId] });
  }
  if (!warning.assignees.length) {
    console.warn(`[alerts] alert ${warning.id} has no deployment user (publisher ${warning.publisherId}), nobody notified`);
    return { warning, notification: "unassigned" };
  }
  if (!(await warningService.claimNotification(warning.id))) {
    return { warning, notification: "already" };
  }
  const users = (await Promise.all(warning.assignees.map((a) => userService.findUserById(a.id)))).filter((u) => !!u);
  const [required, optional] = [NOTIFIERS.filter((n) => n.required), NOTIFIERS.filter((n) => !n.required)];
  const sent = (await Promise.all(required.map((n) => runNotifier(n, warning, users)))).some(Boolean);
  if (!sent) {
    await warningService.releaseNotification(warning.id);
    captureException(new Error("Alert notification not sent"), { extra: { warningId: warning.id, publisherId: warning.publisherId } });
    return { warning, notification: "failed" };
  }
  await Promise.all(optional.map((n) => runNotifier(n, warning, users)));
  return { warning, notification: "sent" };
};

const bump = (open: WarningRecord, input: AlertInput) =>
  warningService.updateWarning(open.id, {
    occurrencesIncrement: 1,
    ...(input.title ? { title: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.procedureUrl ? { procedureUrl: input.procedureUrl } : {}),
  });

// Crée l'alerte (ou incrémente l'alerte ouverte du même type) puis notifie si ce n'est pas déjà fait.
// L'unicité d'une alerte ouverte par (annonceur, type) est garantie par un index unique partiel : en cas de course, on incrémente.
const ingest = async (input: AlertInput): Promise<{ warning: WarningRecord; created: boolean; notification: Notification } | null> => {
  const publisher = await publisherService.findOnePublisherById(input.publisherId);
  if (!publisher) {
    return null;
  }
  const deploymentUserId = publisher.deploymentUserId ?? null;
  const findOpen = () => warningService.findOneWarning({ publisherId: input.publisherId, type: input.type, fixed: false });

  let warning: WarningRecord;
  let created = false;
  const open = await findOpen();
  if (open) {
    warning = await bump(open, input);
  } else {
    try {
      warning = await warningService.createWarning({
        type: input.type,
        title: input.title,
        description: input.description,
        publisherId: input.publisherId,
        procedureUrl: input.procedureUrl,
        assigneeIds: deploymentUserId ? [deploymentUserId] : [],
      });
      created = true;
    } catch (error) {
      const raced = isUniqueViolation(error) ? await findOpen() : null;
      if (!raced) {
        throw error;
      }
      warning = await bump(raced, input);
    }
  }

  const result = await ensureNotified(warning, deploymentUserId);
  return { warning: result.warning, created, notification: result.notification };
};

// Ingère un lot d'alertes et résume le résultat. `unassigned` : alertes en attente faute de chargé de déploiement ;
// `notified` / `notificationFailed` : mails envoyés / échoués (réessayés au prochain webhook).
export const ingestAlerts = async (alerts: AlertInput[]) => {
  let created = 0;
  let updated = 0;
  let notified = 0;
  let notificationFailed = 0;
  const unknownPublishers: string[] = [];
  const unassigned: { publisherId: string; publisherName: string | null }[] = [];
  for (const alert of alerts) {
    const result = await ingest(alert);
    if (!result) {
      unknownPublishers.push(alert.publisherId);
      continue;
    }
    if (result.created) {
      created++;
    } else {
      updated++;
    }
    if (result.notification === "sent") {
      notified++;
    } else if (result.notification === "failed") {
      notificationFailed++;
    } else if (result.notification === "unassigned") {
      unassigned.push({ publisherId: result.warning.publisherId, publisherName: result.warning.publisherName });
    }
  }
  return { created, updated, notified, notificationFailed, unknownPublishers, unassigned };
};
