import { captureException } from "@/error";
import { buildAlertMessage } from "@/services/alerts/notifiers/slack";
import { updateMessage } from "@/services/slack";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";

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
