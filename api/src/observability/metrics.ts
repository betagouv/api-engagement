import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Request, RequestHandler } from "express";

const HISTOGRAM_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60];
const METRICS_EXPORT_INTERVAL_MS = 30000;
const SERVICE_NAME = "api-engagement-api";
const TRACKED_PREFIXES = ["/v0/", "/v2/"];

export interface RecordedHttpRequestMetric {
  durationSeconds: number;
  environment: string;
  method: string;
  publisherId?: string;
  route: string;
  statusCode: number;
}

export interface HttpMetricsRecorder {
  environment?: string;
  forceFlush(): Promise<void>;
  recordHttpRequest(metric: RecordedHttpRequestMetric): void;
  shutdown(): Promise<void>;
}

export interface HttpMetricsConfig {
  environment: string;
  otlpUrl?: string;
  token?: string;
}

const noopRecorder: HttpMetricsRecorder = {
  environment: undefined,
  async forceFlush() {},
  recordHttpRequest() {},
  async shutdown() {},
};

let httpMetricsRecorder: HttpMetricsRecorder = noopRecorder;

const getPathname = (req: Request) => req.originalUrl.split("?")[0];

const buildRouteLabel = (baseUrl: string, routePath: string) => {
  if (!baseUrl) {
    return routePath || "/";
  }

  if (routePath === "/") {
    return baseUrl;
  }

  return `${baseUrl}${routePath}`;
};

const getRequestRoutePath = (req: Request) => {
  if (typeof req.route?.path === "string") {
    return req.route.path;
  }

  if (Array.isArray(req.route?.path) && req.route.path.every((value: string | undefined): value is string => typeof value === "string")) {
    return req.route.path[0] ?? "";
  }

  return undefined;
};

const getPublisherId = (req: Request) => {
  const user = req.user as { firstname?: unknown; id?: unknown } | undefined;

  if (!user || user.id == null || "firstname" in user) {
    return undefined;
  }

  return String(user.id);
};

const shouldTrackPath = (pathname: string) => TRACKED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const createActiveRecorder = (config: Required<Pick<HttpMetricsConfig, "environment" | "otlpUrl" | "token">>): HttpMetricsRecorder => {
  const exporter = new OTLPMetricExporter({
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
    url: config.otlpUrl,
  });

  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: METRICS_EXPORT_INTERVAL_MS,
  });

  const provider = new MeterProvider({
    readers: [reader],
    resource: defaultResource().merge(
      resourceFromAttributes({
        "service.name": SERVICE_NAME,
      })
    ),
  });

  const meter = provider.getMeter(SERVICE_NAME);
  const requestCounter = meter.createCounter("api_engagement_http_requests_total", {
    description: "Nombre total de requetes HTTP par endpoint",
  });
  const requestDurationHistogram = meter.createHistogram("api_engagement_http_request_duration_seconds", {
    advice: {
      explicitBucketBoundaries: HISTOGRAM_BUCKETS,
    },
    description: "Duree des requetes HTTP par endpoint",
    unit: "s",
  });
  const requestByPublisherCounter = meter.createCounter("api_engagement_http_requests_by_publisher_total", {
    description: "Nombre total de requetes HTTP par publisher",
  });

  return {
    environment: config.environment,
    async forceFlush() {
      await provider.forceFlush();
    },
    recordHttpRequest(metric) {
      const requestAttributes = {
        environment: metric.environment,
        method: metric.method,
        route: metric.route,
        status_code: String(metric.statusCode),
      };

      requestCounter.add(1, requestAttributes);
      requestDurationHistogram.record(metric.durationSeconds, requestAttributes);

      if (metric.publisherId) {
        requestByPublisherCounter.add(1, {
          environment: metric.environment,
          publisher_id: metric.publisherId,
          route: metric.route,
        });
      }
    },
    async shutdown() {
      await provider.shutdown();
    },
  };
};

export const initHttpMetrics = (config: HttpMetricsConfig) => {
  if (!config.otlpUrl || !config.token) {
    httpMetricsRecorder = noopRecorder;
    if (config.otlpUrl || config.token) {
      console.warn("[Metrics] URL ou token Cockpit manquant. Export des metrics desactive.");
    }
    return false;
  }

  httpMetricsRecorder = createActiveRecorder({
    environment: config.environment,
    otlpUrl: config.otlpUrl,
    token: config.token,
  });

  return true;
};

export const getHttpMetricsRoute = (req: Request) => {
  const routePath = getRequestRoutePath(req);
  if (!routePath) {
    return "unmatched";
  }

  return buildRouteLabel(req.baseUrl, routePath);
};

export const shouldIgnoreHttpMetrics = (req: Request) => {
  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return true;
  }

  const pathname = getPathname(req);

  if (req.method === "GET" && pathname === "/") {
    return true;
  }

  if (pathname === "/impression.js") {
    return true;
  }

  return !shouldTrackPath(pathname);
};

export const shutdownHttpMetrics = async () => {
  await httpMetricsRecorder.forceFlush();
  await httpMetricsRecorder.shutdown();
};

export const createHttpMetricsMiddleware = (recorder: HttpMetricsRecorder = httpMetricsRecorder): RequestHandler => {
  return (req, res, next) => {
    if (shouldIgnoreHttpMetrics(req)) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.once("finish", () => {
      try {
        recorder.recordHttpRequest({
          durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
          environment: recorder.environment ?? "unknown",
          method: req.method,
          publisherId: getPublisherId(req),
          route: getHttpMetricsRoute(req),
          statusCode: res.statusCode,
        });
      } catch (error) {
        console.error("[Metrics] Failed to record HTTP request metric", error);
      }
    });

    next();
  };
};
