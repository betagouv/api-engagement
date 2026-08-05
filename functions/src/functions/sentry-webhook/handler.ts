// Relais entre le webhook Sentry (plugin legacy WebHooks) et Slack. Une fonction par
// environnement : le message est posté via l'app Slack (même token que l'api) dans le
// channel indiqué par SLACK_CHANNEL_ID.
// Payload « issue alerts » du plugin legacy : https://develop.sentry.dev/integrations/webhooks/
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

  const sentryEvent = payload.event ?? {};
  const channelId = process.env.SLACK_CHANNEL_ID || "";
  const slackToken = process.env.SLACK_TOKEN || "";
  if (slackToken === "" || channelId === "") return json({ error: "Slack token or channel id is not set" }, 500);

  const level = sentryEvent.level ?? payload.level ?? "error";
  const title = sentryEvent.metadata?.type ?? sentryEvent.title ?? payload.message ?? "Nouvel événement Sentry";
  const culprit = payload.culprit ?? sentryEvent.culprit ?? [sentryEvent.request?.method, sentryEvent.request?.url].filter(Boolean).join(" ");
  const preview = sentryEvent.metadata?.value ?? sentryEvent.logentry?.formatted ?? payload.message;

  const emoji = LEVEL_EMOJIS[level] ?? LEVEL_EMOJIS.error;
  const lines = [`${emoji} *${payload.url ? `<${payload.url}|${escapeMrkdwn(title)}>` : escapeMrkdwn(title)}*`];
  if (culprit && culprit !== title) lines.push(`\`${escapeMrkdwn(culprit)}\``);
  if (preview && preview !== title) lines.push(`\`\`\`${escapeMrkdwn(preview.replaceAll("```", "'''").slice(0, 400))}\`\`\``);

  const context = [`Projet : \`${payload.project_name ?? payload.project ?? "?"}\``];
  if (sentryEvent.environment) context.push(`Env : \`${sentryEvent.environment}\``);
  if (sentryEvent.release) context.push(`Release : \`${sentryEvent.release}\``);
  if (payload.triggering_rules?.length) context.push(`Alerte : ${escapeMrkdwn(payload.triggering_rules.join(", "))}`);
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
