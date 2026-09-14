// Relais entre le webhook Sentry et Slack. Une seule fonction pour tous les environnements :
// le message est posté via l'app Slack (même token que l'api) dans le channel correspondant à
// l'environnement de l'événement — SLACK_CHANNEL_ID_STAGING pour staging,
// SLACK_CHANNEL_ID_PRODUCTION pour le reste (le sandbox remonte en "production").
// Deux formes de payload sont acceptées :
//  - plugin legacy WebHooks (champs à la racine + event) : https://develop.sentry.dev/integrations/webhooks/
//  - intégration Sentry / Sentry App, alerte "issue alert" (tout est sous data.event) :
//    https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issue-alerts/
type FunctionEvent = {
  httpMethod: string;
  body?: string;
  isBase64Encoded?: boolean;
};

type SentryEvent = {
  event_id?: string;
  title?: string;
  level?: string;
  platform?: string;
  environment?: string | null;
  release?: string | null;
  timestamp?: number;
  culprit?: string | null;
  logentry?: { formatted?: string | null; message?: string | null } | null;
  metadata?: { type?: string; value?: string; title?: string; filename?: string } | null;
  request?: { method?: string | null; url?: string | null } | null;
  tags?: [string, string][];
  // Uniquement présents dans le payload de l'intégration Sentry.
  url?: string;
  web_url?: string;
};

type SentryWebhookPayload = {
  id?: string;
  project?: string;
  project_name?: string;
  project_slug?: string;
  logger?: string | null;
  level?: string;
  culprit?: string | null;
  message?: string;
  url?: string;
  triggering_rules?: string[];
  event?: SentryEvent;
  // Uniquement présents dans le payload de l'intégration Sentry.
  action?: string;
  data?: { event?: SentryEvent; triggered_rule?: string };
};

const LEVEL_EMOJIS: Record<string, string> = { fatal: "⚫️", error: "🔴", warning: "🟡", info: "🔵", debug: "🟢" };
// Couleur de la barre latérale de l'attachment Slack, indexée sur le niveau Sentry.
const LEVEL_COLORS: Record<string, string> = { fatal: "#b3131a", error: "#e03e2f", warning: "#f2a100", info: "#439fe0", debug: "#9b9b9b" };

const json = (body: object, statusCode: number) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Slack impose d'échapper &, < et > dans tout texte mrkdwn (y compris les blocs de code).
const escapeMrkdwn = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const handle = async (event: FunctionEvent) => {
  if (event.httpMethod !== "POST") return json({ error: "Method not allowed" }, 405);

  const raw = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString() : (event.body ?? "");
  let payload: SentryWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const sentryEvent = payload.event ?? payload.data?.event ?? {};
  if (!sentryEvent.event_id) console.warn(`Sentry webhook: payload inattendu (clés: ${Object.keys(payload).join(", ")})`);

  const channelId = (sentryEvent.environment === "staging" ? process.env.SLACK_CHANNEL_ID_STAGING : process.env.SLACK_CHANNEL_ID_PRODUCTION) || "";
  const slackToken = process.env.SLACK_TOKEN || "";
  if (slackToken === "" || channelId === "") return json({ error: "Slack token or channel id is not set" }, 500);

  const level = sentryEvent.level ?? payload.level ?? "error";
  const title = sentryEvent.metadata?.type ?? sentryEvent.title ?? payload.message ?? "Nouvel événement Sentry";
  const culprit = payload.culprit ?? sentryEvent.culprit ?? [sentryEvent.request?.method, sentryEvent.request?.url].filter(Boolean).join(" ");
  const preview = sentryEvent.metadata?.value ?? sentryEvent.logentry?.formatted ?? payload.message;
  const issueUrl = payload.url ?? sentryEvent.web_url;

  const emoji = LEVEL_EMOJIS[level] ?? LEVEL_EMOJIS.error;
  const lines = [`${emoji} *${issueUrl ? `<${issueUrl}|${escapeMrkdwn(title)}>` : escapeMrkdwn(title)}*`];
  if (culprit && culprit !== title) lines.push(`\`${escapeMrkdwn(culprit)}\``);
  if (preview && preview !== title) lines.push(`\`\`\`${escapeMrkdwn(preview.replaceAll("```", "'''").slice(0, 400))}\`\`\``);

  // L'intégration Sentry n'envoie pas le nom du projet, seulement son id numérique : on récupère
  // son slug dans l'url d'api de l'événement (https://<sentry>/api/0/projects/<org>/<projet>/events/<id>/).
  const projectFromEventUrl = sentryEvent.url?.match(/\/projects\/[^/]+\/([^/]+)\//)?.[1];
  const triggeringRules = payload.triggering_rules ?? (payload.data?.triggered_rule ? [payload.data.triggered_rule] : []);

  const projectName = payload.project_name ?? payload.project ?? projectFromEventUrl ?? "?";

  const context = [`Projet : \`${projectName.replace("api-engagement-", "")}\``];
  if (sentryEvent.environment) context.push(`Env : \`${sentryEvent.environment}\``);
  if (sentryEvent.release) context.push(`Release : \`${sentryEvent.release}\``);
  if (triggeringRules.length) context.push(`Alerte : ${escapeMrkdwn(triggeringRules.join(", "))}`);
  if (sentryEvent.timestamp) context.push(`<!date^${Math.floor(sentryEvent.timestamp)}^{date_short_pretty} {time_secs}|${new Date(sentryEvent.timestamp * 1000).toISOString()}>`);

  // Attachment + blocks : barre de couleur par niveau, ligne de contexte en petit texte gris.
  const slackMessage = {
    channel: channelId,
    attachments: [
      {
        color: LEVEL_COLORS[level] ?? LEVEL_COLORS.error,
        fallback: `${emoji} [${level}] ${title}`,
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
          { type: "context", elements: [{ type: "mrkdwn", text: context.join("  ·  ") }] },
        ],
      },
    ],
  };

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${slackToken}`, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(slackMessage),
    });
    // L'API Slack répond 200 même en cas d'échec : le statut est dans le champ ok.
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (data.ok !== true) {
      console.error(`Slack error: ${data.error ?? response.status}`);
      return json({ error: "Slack request failed" }, 502);
    }
  } catch (error) {
    console.error(error);
    return json({ error: "Internal error" }, 500);
  }

  return json({ ok: true }, 200);
};
