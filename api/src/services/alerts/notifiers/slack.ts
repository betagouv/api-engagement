import { APP_URL, SLACK_WARNING_CHANNEL_ID } from "@/config";
import type { AlertNotifier } from "@/services/alerts/notifiers/types";
import { postMessage } from "@/services/slack";
import { formatDate } from "@/utils/date";

// Échappe le mrkdwn Slack pour le contenu venant de l'extérieur (Metabase).
const escapeMrkdwn = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Même contenu que le mail ; mentionne les assignés qui ont un `slackUserId`, sinon leur prénom.
export const slackNotifier: AlertNotifier = {
  name: "slack",
  required: false,
  async notify(warning, users) {
    const mentions = users.map((u) => (u.slackUserId ? `<@${u.slackUserId}>` : u.firstname)).join(", ");
    const lines = [
      `*[Alerte] ${escapeMrkdwn(warning.publisherName ?? "Annonceur")} : ${escapeMrkdwn(warning.title ?? warning.type)}*`,
      ...(warning.description ? [escapeMrkdwn(warning.description)] : []),
      `Déclenchée le ${formatDate(warning.createdAt)} · ${warning.occurrences} occurrence(s)`,
      ...(warning.procedureUrl ? [`<${warning.procedureUrl}|Procédure>`] : []),
      `<${APP_URL}/admin-warning/alerts/${warning.id}|Ouvrir l'alerte>`,
      ...(mentions ? [`À traiter par ${mentions}`] : []),
    ];
    const text = lines.join("\n");
    const res = await postMessage({ text, blocks: [{ type: "section", text: { type: "mrkdwn", text } }] }, SLACK_WARNING_CHANNEL_ID);
    if (!res?.ok) {
      throw new Error(`Slack alert notification failed: ${res?.error ?? "unknown"}`);
    }
    return true;
  },
};
