import * as Sentry from "@sentry/node";

import { ENVIRONMENT } from "./config";

export const captureException = (error: any, context?: string) => {
  if (context) console.log(context);
  if (ENVIRONMENT !== "development") Sentry.captureException(error);
  else console.error(error);
};

export const captureMessage = (message: string, context?: string) => {
  if (context) console.log(context);
  if (ENVIRONMENT !== "development") Sentry.captureMessage(message);
  else console.info(message);
};
