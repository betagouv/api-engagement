import { EventEmitter } from "node:events";

import { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpMetricsMiddleware, HttpMetricsRecorder, initHttpMetrics, RecordedHttpRequestMetric, shutdownHttpMetrics } from "@/observability/metrics";

class MockHttpMetricsRecorder implements HttpMetricsRecorder {
  environment = "test";
  records: RecordedHttpRequestMetric[] = [];

  recordHttpRequest(metric: RecordedHttpRequestMetric): void {
    this.records.push(metric);
  }

  async forceFlush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}

const executeMetricsMiddleware = async ({
  baseUrl = "",
  method = "GET",
  originalUrl,
  routePath,
  statusCode = 200,
  user,
}: {
  baseUrl?: string;
  method?: string;
  originalUrl: string;
  routePath?: string;
  statusCode?: number;
  user?: unknown;
}) => {
  const recorder = new MockHttpMetricsRecorder();
  const middleware = createHttpMetricsMiddleware(recorder);
  const req = {
    baseUrl,
    method,
    originalUrl,
    route: routePath ? { path: routePath } : undefined,
    user,
  } as Request;
  const res = new EventEmitter() as Response & EventEmitter;
  res.statusCode = statusCode;

  await new Promise<void>((resolve, reject) => {
    const next: NextFunction = (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    middleware(req, res, next);
  });

  res.emit("finish");

  return recorder.records;
};

describe("HTTP metrics middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records a normalized route for partner endpoints", async () => {
    const records = await executeMetricsMiddleware({
      baseUrl: "/v0/books",
      method: "GET",
      originalUrl: "/v0/books/123",
      routePath: "/:id",
      statusCode: 201,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      environment: "test",
      method: "GET",
      route: "/v0/books/:id",
      statusCode: 201,
    });
    expect(records[0]!.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it("reconstructs the mounted route prefix for dynamic partner endpoints", async () => {
    const records = await executeMetricsMiddleware({
      method: "GET",
      originalUrl: "/v2/mission/68b57297db8e5bb5cefb8a39",
      routePath: "/:id",
      statusCode: 200,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      environment: "test",
      method: "GET",
      route: "/v2/mission/:id",
      statusCode: 200,
    });
  });

  it("records unmatched partner routes as unmatched", async () => {
    const records = await executeMetricsMiddleware({
      method: "GET",
      originalUrl: "/v0/unknown",
      statusCode: 404,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      environment: "test",
      route: "unmatched",
      statusCode: 404,
    });
  });

  it("ignores healthcheck, technical routes and non partner routes", async () => {
    const healthcheckRecords = await executeMetricsMiddleware({
      method: "GET",
      originalUrl: "/",
      routePath: "/",
    });
    const impressionRecords = await executeMetricsMiddleware({
      method: "GET",
      originalUrl: "/impression.js",
      routePath: "/impression.js",
    });
    const headRecords = await executeMetricsMiddleware({
      method: "HEAD",
      originalUrl: "/v0/head-test",
      routePath: "/head-test",
    });
    const optionsRecords = await executeMetricsMiddleware({
      method: "OPTIONS",
      originalUrl: "/v0/options-test",
      routePath: "/options-test",
      statusCode: 204,
    });
    const adminRecords = await executeMetricsMiddleware({
      baseUrl: "/mission",
      method: "GET",
      originalUrl: "/mission/search",
      routePath: "/search",
    });

    expect(healthcheckRecords).toHaveLength(0);
    expect(impressionRecords).toHaveLength(0);
    expect(headRecords).toHaveLength(0);
    expect(optionsRecords).toHaveLength(0);
    expect(adminRecords).toHaveLength(0);
  });

  it("uses the publisher id from req.user on partner routes", async () => {
    const records = await executeMetricsMiddleware({
      baseUrl: "/v0/publisher",
      method: "GET",
      originalUrl: "/v0/publisher",
      routePath: "/",
      user: { id: "publisher-123" },
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      environment: "test",
      publisherId: "publisher-123",
      route: "/v0/publisher",
    });
  });
});

describe("HTTP metrics bootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not initialize metrics when config is incomplete", async () => {
    const initialized = initHttpMetrics({
      environment: "test",
      otlpUrl: "",
      token: "",
    });

    expect(initialized).toBe(false);
    await expect(shutdownHttpMetrics()).resolves.toBeUndefined();
  });

  it("initializes metrics when config is complete", async () => {
    const initialized = initHttpMetrics({
      environment: "test",
      otlpUrl: "http://127.0.0.1:4318/otlp/v1/metrics",
      token: "token",
    });

    expect(initialized).toBe(true);
    await expect(shutdownHttpMetrics()).resolves.toBeUndefined();
  });
});
