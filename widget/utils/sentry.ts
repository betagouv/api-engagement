import * as Sentry from "@sentry/nextjs";

export const captureMessageWithRequestId = (requestId: string, message: string, extra: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    scope.setTag("request_id", requestId);
    Sentry.captureMessage(message, { extra });
  });
};

export const captureExceptionWithRequestId = (requestId: string, error: unknown, extra: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    scope.setTag("request_id", requestId);
    Sentry.captureException(error, { extra });
  });
};
