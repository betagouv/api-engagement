import * as Sentry from "@sentry/node";

import { ENVIRONMENT } from "./config";

export const captureException = (error: any, context?: string) => {
  if (context) console.log(context);
  console.error(error);
  if (ENVIRONMENT !== "development") Sentry.captureException(error);
};

export const captureMessage = (message: string, context?: string) => {
  if (context) console.log(context);
  console.info(message);
  if (ENVIRONMENT !== "development") Sentry.captureMessage(message);
};
