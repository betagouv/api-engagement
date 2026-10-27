import { APP_URL, SLACK_SIGNING_SECRET, SLACK_WARNING_CHANNEL_ID } from "@/config";
import { captureException } from "@/error";
import type { AlertNotifier } from "@/services/alerts/notifiers/types";
import { postMessage, updateMessage } from "@/services/slack";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import type { UserRecord } from "@/types/user";
import type { WarningRecord, WarningStatus } from "@/types/warning";
import { formatDate } from "@/utils/date";

export const STATUS_ACTION_PREFIX = "alert_status:";

const STATUS_LABELS: Record<WarningStatus, string> = { TODO: "À traiter", IN_PROGRESS: "En cours", RESOLVED: "Résolue" };

// Échappe le mrkdwn Slack pour le contenu venant de l'extérieur (Metabase).
const escapeMrkdwn = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const button = (warning: WarningRecord, status: WarningStatus, text: string, style?: "primary") => ({
  type: "button",
  action_id: `${STATUS_ACTION_PREFIX}${status}`,
  text: { type: "plain_text", text },
  value: warning.id,
  ...(style ? { style } : {}),
});

// Mêmes libellés et emojis que le back-office (app/src/constants).
const TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  EMPTY_WARNING: { emoji: "🙁", label: "Flux vide" },
  ERROR_WARNING: { emoji: "❌", label: "Erreur de flux" },
  VALIDATION_WARNING: { emoji: "🙅", label: "Taux de validation critique" },
  TRACKING_WARNING: { emoji: "🤔", label: "Problème de tracking" },
};

// Limites Slack (section : 3000 caractères, champ : 2000, en-tête : 150) : on tronque le contenu libre venant de l'extérieur.
const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const field = (label: string, value: string) => ({ type: "mrkdwn", text: `*${label}*\n${value}` });

// Même contenu que le mail ; mentionne les assignés qui ont un `slackUserId`, sinon leur prénom (échappé : `<!here>` ne doit pas pinguer).
// `handledBy` : prénom de la personne qui a changé le statut, affiché avec le statut.
export const buildAlertMessage = (warning: WarningRecord, users: UserRecord[], handledBy?: string) => {
  const { emoji, label } = TYPE_LABELS[warning.type] ?? { emoji: "🚨", label: "Alerte" };
  const publisher = escapeMrkdwn(truncate(warning.publisherName ?? "Annonceur", 200));
  const title = escapeMrkdwn(truncate(warning.title ?? label, 300));
  const mentions = users.map((u) => (u.slackUserId ? `<@${u.slackUserId}>` : escapeMrkdwn(u.firstname))).join(", ");
  const status = `${STATUS_LABELS[warning.status]}${handledBy ? ` (par ${escapeMrkdwn(truncate(handledBy, 100))})` : ""}`;
  const links = [`<${APP_URL}/admin-warning/alerts/${warning.id}|Ouvrir l'alerte>`, ...(warning.procedureUrl ? [`<${warning.procedureUrl}|Procédure>`] : [])];
  // Une seule Slack app pour tous les environnements : sans secret de signature, cet environnement ne sait pas traiter les clics.
  const actions =
    warning.status === "RESOLVED" || !SLACK_SIGNING_SECRET
      ? []
      : [
          {
            type: "actions",
            elements: [...(warning.status === "TODO" ? [button(warning, "IN_PROGRESS", "En cours")] : []), button(warning, "RESOLVED", "Résolu", "primary")],
          },
        ];
  return {
    text: `[Alerte] ${publisher} : ${title}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: truncate(`${emoji} ${label}`, 150), emoji: true } },
      {
        type: "section",
        text: { type: "mrkdwn", text: [`*${title}*`, ...(warning.description ? [escapeMrkdwn(truncate(warning.description, 2000))] : [])].join("\n") },
        fields: [
          field("Annonceur", publisher),
          field("Statut", status),
          field("Déclenchée le", formatDate(warning.createdAt)),
          field("Occurrences", String(warning.occurrences)),
          ...(mentions ? [field("À traiter par", truncate(mentions, 1900))] : []),
        ],
      },
      { type: "context", elements: [{ type: "mrkdwn", text: links.join("  ·  ") }] },
      ...actions,
    ],
  };
};

// Poste l'alerte dans Slack et mémorise le message pour le mettre à jour ensuite (voir `refreshSlackMessage`).
export const slackNotifier: AlertNotifier = {
  name: "slack",
  required: false,
  async notify(warning, users) {
    const { text, blocks } = buildAlertMessage(warning, users);
    const res = await postMessage({ text, blocks }, SLACK_WARNING_CHANNEL_ID);
    if (!res?.ok) {
      throw new Error(`Slack alert notification failed: ${res?.error ?? "unknown"}`);
    }
    // Sans token (log seul), Slack ne renvoie pas de message : rien à mémoriser.
    if (res.ts && res.channel) {
      await warningService.updateWarning(warning.id, { slackMessage: { channelId: res.channel, ts: res.ts } });
    }
    return true;
  },
};

// Met à jour le message Slack d'une alerte (statut, boutons) après un changement de statut, d'où qu'il vienne. Best-effort.
export const refreshSlackMessage = async (warningId: string, handledBy?: string) => {
  try {
    const warning = await warningService.findWarningById(warningId);
    if (!warning?.slackChannelId || !warning.slackMessageTs) {
      return;
    }
    const users = (await Promise.all(warning.assignees.map((a) => userService.findUserById(a.id)))).filter((u) => !!u);
    const res = await updateMessage(buildAlertMessage(warning, users, handledBy), warning.slackChannelId, warning.slackMessageTs);
    if (!res?.ok) {
      throw new Error(`Slack alert update failed: ${res?.error ?? "unknown"}`);
    }
  } catch (error) {
    captureException(error, { extra: { warningId } });
  }
};
