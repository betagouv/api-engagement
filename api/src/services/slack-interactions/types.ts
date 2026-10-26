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
