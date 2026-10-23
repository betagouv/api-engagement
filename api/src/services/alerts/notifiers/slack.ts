import { SLACK_WARNING_CHANNEL_ID } from "@/config";
import { buildAlertMessage } from "@/services/alerts/notifiers/slack-message";
import type { AlertNotifier } from "@/services/alerts/notifiers/types";
import { postMessage } from "@/services/slack";
import { warningService } from "@/services/warning";

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
