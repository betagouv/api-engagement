import { refreshSlackMessage, STATUS_ACTION_PREFIX } from "@/services/alerts/notifiers/slack";
import { respondEphemeral } from "@/services/slack";
import type { SlackInteractionHandler } from "@/services/slack/interactions";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import { WARNING_STATUSES } from "@/types/warning";
import { isUniqueViolation } from "@/utils/prisma";

// Actions des boutons du message Slack d'une alerte (pendant de ./reply.ts pour les réponses mail).
// Boutons « En cours » / « Résolu » du message d'alerte. Réservé aux assignés et aux admins dont le compte est lié à un ID Slack.
export const alertStatusInteraction: SlackInteractionHandler = {
  prefix: STATUS_ACTION_PREFIX,
  async handle(action, { slackUserId, responseUrl }) {
    const status = WARNING_STATUSES.find((s) => s === action.actionId.slice(STATUS_ACTION_PREFIX.length));
    if (!action.value || !status) {
      return;
    }
    const warning = await warningService.findWarningById(action.value);
    if (!warning) {
      await respondEphemeral(responseUrl, "Cette alerte n'existe plus.");
      return;
    }
    const user = await userService.findUserBySlackUserId(slackUserId);
    if (!user) {
      await respondEphemeral(responseUrl, "Votre compte Slack n'est pas lié à un compte API Engagement : demandez à un admin de renseigner votre ID Slack.");
      return;
    }
    if (user.role !== "admin" && !warning.assignees.some((a) => a.id === user.id)) {
      await respondEphemeral(responseUrl, "Seuls les assignés de l'alerte peuvent changer son statut.");
      return;
    }

    try {
      if (warning.status !== status) {
        await warningService.updateWarning(warning.id, { status });
      }
    } catch (error) {
      // Index unique partiel : une seule alerte ouverte par annonceur et type.
      if (isUniqueViolation(error)) {
        await respondEphemeral(responseUrl, "Une alerte ouverte existe déjà pour cet annonceur et ce type.");
        return;
      }
      throw error;
    }
    await refreshSlackMessage(warning.id, user.firstname);
  },
};
