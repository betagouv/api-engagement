import * as Sentry from "@sentry/nextjs";
import { REQUEST_ID_HEADER } from "./utils/requestId";

const normalizeError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "string") {
    return new Error(value);
  }

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
};

const captureLifecycleError = (
  event: string,
  value: unknown,
  extra: Record<string, unknown> = {},
) => {
  const error = normalizeError(value);

  Sentry.withScope((scope) => {
    scope.setTag("event", event);

    Object.entries(extra).forEach(([key, val]) => {
      scope.setExtra(key, val);
    });

    Sentry.captureException(error);
  });
};

export function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "middleware";
    revalidateReason: "on-demand" | "stale" | undefined;
  },
) {
  const log = {
    level: "error",
    method: request.method,
    path: request.path,
    route: context.routePath,
    route_type: context.routeType,
    request_id: request.headers[REQUEST_ID_HEADER],
    error: error.message,
    digest: error.digest,
  };

  console.error(JSON.stringify(log));

  Sentry.captureRequestError(error, request, context);
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { registerLifecycleHooks } = await import("./instrumentation-node");
    registerLifecycleHooks(captureLifecycleError);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
