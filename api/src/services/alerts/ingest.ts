import { APP_URL, INBOUND_EMAIL_DOMAIN, SLACK_WARNING_CHANNEL_ID } from "@/config";
import { captureException } from "@/error";
import { alertReplyAddress } from "@/services/alerts/reply";
import type { AlertInput } from "@/services/alerts/types";
import { sendTemplate, TEMPLATE_IDS } from "@/services/brevo/email";
import { publisherService } from "@/services/publisher";
import { postMessage } from "@/services/slack";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import type { WarningRecord } from "@/types/warning";
import { isUniqueViolation } from "@/utils/prisma";

const formatDate = (date: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);

// Envoie le mail d'alerte aux utilisateurs donnés (les emails ne quittent jamais l'API) et renvoie le nombre d'envois réussis.
// Template Brevo (TEMPLATE_IDS.WARNING_ALERT) géré dans Brevo ; params : firstname, publisherName, title, description,
// triggeredAtLabel, procedureUrl?, occurrences, alertsUrl, alertUrl. L'objet est défini ici.
const notifyUsers = async (warning: WarningRecord, userIds: string[]): Promise<number> => {
  let sent = 0;
  for (const userId of userIds) {
    const user = await userService.findUserById(userId);
    if (!user) {
      continue;
    }
    const { ok } = await sendTemplate(TEMPLATE_IDS.WARNING_ALERT, {
      emailTo: [user.email],
      // Une réponse à ce mail arrive sur /inbound-email (voir ./reply.ts) et résout l'alerte.
      ...(INBOUND_EMAIL_DOMAIN ? { replyTo: alertReplyAddress(warning.id, user.id) } : {}),
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
        alertUrl: `${APP_URL}/admin-warning/alerts/${warning.id}`,
      },
    });
    if (ok) {
      sent++;
    }
  }
  return sent;
};

// Échappe le mrkdwn Slack pour le contenu venant de l'extérieur (Metabase).
const escapeMrkdwn = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Poste l'alerte dans Slack avec le même contenu que le mail ; mentionne les assignés qui ont un `slackUserId`, sinon leur prénom.
// Un échec Slack n'est que reporté : il ne doit pas remettre en cause l'envoi du mail.
const notifySlack = async (warning: WarningRecord, userIds: string[]) => {
  try {
    const users = (await Promise.all(userIds.map((id) => userService.findUserById(id)))).filter((u) => !!u);
    const mentions = users.map((u) => (u.slackUserId ? `<@${u.slackUserId}>` : u.firstname)).join(", ");
    const alertUrl = `${APP_URL}/admin-warning/alerts/${warning.id}`;
    const lines = [
      `*[Alerte] ${escapeMrkdwn(warning.publisherName ?? "Annonceur")} : ${escapeMrkdwn(warning.title ?? warning.type)}*`,
      ...(warning.description ? [escapeMrkdwn(warning.description)] : []),
      `Déclenchée le ${formatDate(warning.createdAt)} · ${warning.occurrences} occurrence(s)`,
      ...(warning.procedureUrl ? [`<${warning.procedureUrl}|Procédure>`] : []),
      `<${alertUrl}|Ouvrir l'alerte>`,
      ...(mentions ? [`À traiter par ${mentions}`] : []),
    ];
    const text = lines.join("\n");
    const res = await postMessage({ text, blocks: [{ type: "section", text: { type: "mrkdwn", text } }] }, SLACK_WARNING_CHANNEL_ID);
    if (!res?.ok) {
      throw new Error(`Slack alert notification failed: ${res?.error ?? "unknown"}`);
    }
  } catch (error) {
    captureException(error, { extra: { warningId: warning.id } });
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
  const sent = await notifyUsers(
    warning,
    warning.assignees.map((a) => a.id)
  );
  if (!sent) {
    await warningService.releaseNotification(warning.id);
    captureException(new Error("Alert notification not sent"), { extra: { warningId: warning.id, publisherId: warning.publisherId } });
    return { warning, notification: "failed" };
  }
  await notifySlack(
    warning,
    warning.assignees.map((a) => a.id)
  );
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
