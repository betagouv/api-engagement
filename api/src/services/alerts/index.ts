import { MetabaseAlertProvider } from "./providers/metabase";
import type { AlertProvider } from "./types";

// Sources d'alertes supportées, par nom : `POST /warning/webhook/:source`.
export const alertProviders: Record<string, AlertProvider> = {
  metabase: new MetabaseAlertProvider(),
};

export const getAlertProvider = (source: string): AlertProvider | undefined => (Object.prototype.hasOwnProperty.call(alertProviders, source) ? alertProviders[source] : undefined);
