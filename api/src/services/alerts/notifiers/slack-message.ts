import { APP_URL } from "@/config";
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

// Un bloc `section` est limité à 3000 caractères : on tronque le contenu libre (titre, description) venant de l'extérieur.
const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const section = (lines: string[]) => ({ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } });

// Même contenu que le mail ; mentionne les assignés qui ont un `slackUserId`, sinon leur prénom (échappé : `<!here>` ne doit pas pinguer).
// `handledBy` : prénom de la personne qui a changé le statut, affiché dans la ligne de statut.
export const buildAlertMessage = (warning: WarningRecord, users: UserRecord[], handledBy?: string) => {
  const mentions = users.map((u) => (u.slackUserId ? `<@${u.slackUserId}>` : escapeMrkdwn(u.firstname))).join(", ");
  const head = [
    `*[Alerte] ${escapeMrkdwn(truncate(warning.publisherName ?? "Annonceur", 200))} : ${escapeMrkdwn(truncate(warning.title ?? warning.type, 300))}*`,
    ...(warning.description ? [escapeMrkdwn(truncate(warning.description, 2000))] : []),
  ];
  const details = [
    `Déclenchée le ${formatDate(warning.createdAt)} · ${warning.occurrences} occurrence(s)`,
    ...(warning.procedureUrl ? [`<${warning.procedureUrl}|Procédure>`] : []),
    `<${APP_URL}/admin-warning/alerts/${warning.id}|Ouvrir l'alerte>`,
    ...(mentions ? [`À traiter par ${mentions}`] : []),
  ];
  const statusLine = `Statut : *${STATUS_LABELS[warning.status]}*${handledBy ? ` · par ${escapeMrkdwn(handledBy)}` : ""}`;
  const actions =
    warning.status === "RESOLVED"
      ? []
      : [
          {
            type: "actions",
            elements: [...(warning.status === "TODO" ? [button(warning, "IN_PROGRESS", "En cours")] : []), button(warning, "RESOLVED", "Résolu", "primary")],
          },
        ];
  return {
    text: head[0],
    blocks: [section(head), section(details), { type: "context", elements: [{ type: "mrkdwn", text: statusLine }] }, ...actions],
  };
};
