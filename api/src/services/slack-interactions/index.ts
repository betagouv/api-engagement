import { alertStatusInteraction } from "@/services/alerts/slack-interactions";
import type { SlackAction, SlackInteractionContext, SlackInteractionHandler } from "@/services/slack-interactions/types";

// Une interaction Slack est routée vers le handler dont le préfixe correspond à l'`action_id` du bouton.
const HANDLERS: SlackInteractionHandler[] = [alertStatusInteraction];

export const dispatchInteraction = async (action: SlackAction, context: SlackInteractionContext) => {
  await HANDLERS.find((handler) => action.actionId.startsWith(handler.prefix))?.handle(action, context);
};
