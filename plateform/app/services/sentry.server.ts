import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";
import { ENV, SENTRY_DSN } from "~/services/config";

const requestIds = new WeakMap<Request, string>();
const loggedErrors = new WeakMap<Request, Set<unknown>>();

export function getRequestId(request: Request): string {
  let id = requestIds.get(request);
  if (!id) {
    const incoming = request.headers.get("x-request-id");
    id = incoming && /^[a-zA-Z0-9_-]{1,128}$/.test(incoming) ? incoming : randomUUID();
    requestIds.set(request, id);
  }
  return id;
}

// Les messages libres peuvent contenir des corps de réponse ou des données personnelles.
// Conserver les frames techniques et les codes réseau, sans le message ni l'objet brut.
export function describeError(error: unknown, depth = 0): Record<string, unknown> {
  if (!(error instanceof Error)) return { name: "UnknownError" };
  const code = "code" in error && typeof error.code === "string" && /^[a-zA-Z0-9_]{1,64}$/.test(error.code) ? error.code : undefined;
  const stack = error.stack
    ?.split("\n")
    .filter((line) => /^\s+at /.test(line))
    .slice(0, 12)
    .join("\n");
  return { name: error.name, code, stack, cause: depth < 3 && error.cause instanceof Error ? describeError(error.cause, depth + 1) : undefined };
}

let initialized = false;

function initServerSentry(): boolean {
  const dsn = SENTRY_DSN;
  const environment = process.env.ENV ?? ENV;
  if (!dsn || environment === "development") return false;
  if (!initialized) {
    Sentry.init({
      dsn,
      environment,
      sendDefaultPii: false,
      // Seules les erreurs déjà anonymisées par notre logger sont envoyées.
      defaultIntegrations: false,
      skipOpenTelemetrySetup: true,
      initialScope: { tags: { runtime: "server", service: "plateform" } },
      beforeSend(event) {
        delete event.request;
        delete event.user;
        delete event.breadcrumbs;
        event.tags = { ...event.tags, runtime: "server", service: "plateform" };
        return event;
      },
    });
    initialized = true;
  }
  return true;
}

function toReportedError(details: Record<string, unknown>, event: string, depth = 0): Error {
  const name = typeof details.name === "string" ? details.name : "Error";
  const message = `${event}: ${typeof details.code === "string" ? details.code : name}`;
  const cause = depth < 3 && details.cause && typeof details.cause === "object" ? toReportedError(details.cause as Record<string, unknown>, event, depth + 1) : undefined;
  const error = new Error(message, { cause });
  error.name = name;
  // Conserver les frames d'origine pour le regroupement et les sourcemaps,
  // sans remettre le message libre qui pouvait contenir des données privées.
  error.stack = `${name}: ${message}${typeof details.stack === "string" ? `\n${details.stack}` : ""}`;
  return error;
}

export function logServerError(request: Request, event: string, error: unknown, details: Record<string, unknown> = {}) {
  if (request.signal.aborted) return;
  const seen = loggedErrors.get(request) ?? new Set<unknown>();
  if (seen.has(error)) return;
  seen.add(error);
  loggedErrors.set(request, seen);
  const context = {
    timestamp: new Date().toISOString(),
    level: "error",
    service: "plateform",
    runtime: "server",
    event,
    request_id: getRequestId(request),
    method: request.method,
    path: new URL(request.url).pathname,
    ...details,
  };
  const errorDetails = describeError(error);
  console.error(JSON.stringify({ ...context, error: errorDetails }));
  try {
    if (!initServerSentry()) return;
    Sentry.captureException(toReportedError(errorDetails, event), {
      tags: { runtime: "server", service: "plateform", event, request_id: context.request_id },
      extra: { ...context, error: errorDetails },
    });
  } catch {
    // Un problème d'observabilité ne doit pas casser la réponse HTTP.
    console.warn(JSON.stringify({ level: "warn", service: "plateform", event: "sentry_reporting_failed", runtime: "server" }));
  }
}
