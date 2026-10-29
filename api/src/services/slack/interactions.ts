import { alertStatusInteraction } from "@/services/alerts/interactions";

export interface SlackAction {
  actionId: string;
  value?: string;
}

export interface SlackInteractionContext {
  slackUserId: string;
  responseUrl: string;
}

export interface SlackInteractionHandler {
  // Préfixe des `action_id` pris en charge (ex. `alert_status:`).
  prefix: string;
  handle(action: SlackAction, context: SlackInteractionContext): Promise<void>;
}

// Une interaction Slack est routée vers le handler dont le préfixe correspond à l'`action_id` du bouton.
const HANDLERS: SlackInteractionHandler[] = [alertStatusInteraction];

export const dispatchInteraction = async (action: SlackAction, context: SlackInteractionContext) => {
  await HANDLERS.find((handler) => action.actionId.startsWith(handler.prefix))?.handle(action, context);
};
