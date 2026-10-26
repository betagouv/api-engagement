import { refreshSlackMessage, STATUS_ACTION_PREFIX } from "@/services/alerts/notifiers/slack";
import { respondEphemeral } from "@/services/slack";
import type { SlackInteractionHandler } from "@/services/slack/interactions";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import type { WarningStatus } from "@/types/warning";

// Statuts de départ autorisés pour chaque bouton : on ne rouvre jamais une alerte résolue (message Slack périmé).
const ALLOWED_FROM: Partial<Record<WarningStatus, WarningStatus[]>> = { IN_PROGRESS: ["TODO"], RESOLVED: ["TODO", "IN_PROGRESS"] };

// Actions des boutons du message Slack d'une alerte (pendant de ./reply.ts pour les réponses mail).
// Boutons « En cours » / « Résolu » du message d'alerte. Réservé aux assignés et aux admins dont le compte est lié à un ID Slack.
export const alertStatusInteraction: SlackInteractionHandler = {
  prefix: STATUS_ACTION_PREFIX,
  async handle(action, { slackUserId, responseUrl }) {
    const status = Object.keys(ALLOWED_FROM).find((s) => s === action.actionId.slice(STATUS_ACTION_PREFIX.length)) as WarningStatus | undefined;
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

    // Conditionné à l'état attendu : un bouton périmé ou un clic concurrent ne change rien, le message est resynchronisé.
    if (!(await warningService.transitionStatus(warning.id, ALLOWED_FROM[status]!, status))) {
      await respondEphemeral(responseUrl, "Le statut de cette alerte a déjà changé : le message est mis à jour.");
      await refreshSlackMessage(warning.id);
      return;
    }
    await refreshSlackMessage(warning.id, user.firstname);
  },
};
