import { APP_URL, SLACK_WARNING_CHANNEL_ID } from "@/config";
import type { AlertNotifier } from "@/services/alerts/notifiers/types";
import { postMessage } from "@/services/slack";
import { formatDate } from "@/utils/date";

// Échappe le mrkdwn Slack pour le contenu venant de l'extérieur (Metabase).
const escapeMrkdwn = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Un bloc `section` est limité à 3000 caractères : on tronque le contenu libre (titre, description) venant de l'extérieur.
const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// Même contenu que le mail ; mentionne les assignés qui ont un `slackUserId`, sinon leur prénom (échappé : `<!here>` ne doit pas pinguer).
export const slackNotifier: AlertNotifier = {
  name: "slack",
  required: false,
  async notify(warning, users) {
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
    const section = (lines: string[]) => ({ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } });
    const res = await postMessage({ text: [...head, ...details].join("\n"), blocks: [section(head), section(details)] }, SLACK_WARNING_CHANNEL_ID);
    if (!res?.ok) {
      throw new Error(`Slack alert notification failed: ${res?.error ?? "unknown"}`);
    }
    return true;
  },
};
