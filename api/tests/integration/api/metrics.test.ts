import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HttpMetricsRecorder, RecordedHttpRequestMetric } from "@/services/observability/metrics";
import { createTestPublisher } from "../../fixtures";
import { createTestUser } from "../../fixtures/user";
import { createTestApp } from "../../testApp";

class MockHttpMetricsRecorder implements HttpMetricsRecorder {
  environment = "test";
  records: RecordedHttpRequestMetric[] = [];

  recordHttpRequest(metric: RecordedHttpRequestMetric): void {
    this.records.push(metric);
  }

  async forceFlush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}

describe("HTTP metrics integration", () => {
  let recorder: MockHttpMetricsRecorder;

  beforeEach(() => {
    recorder = new MockHttpMetricsRecorder();
  });

  it("records publisher usage for API-key routes", async () => {
    const app = createTestApp({ metricsRecorder: recorder });
    const publisher = await createTestPublisher({ publishers: [] });

    const response = await request(app).get("/v0/mission").set("x-api-key", publisher.apikey!);

    expect(response.status).toBe(400);
    expect(recorder.records).toHaveLength(1);
    expect(recorder.records[0]).toMatchObject({
      environment: "test",
      method: "GET",
      publisherId: publisher.id,
      route: "/v0/mission",
    });
  });

  it("does not record non partner JWT routes", async () => {
    const app = createTestApp({ metricsRecorder: recorder });
    const publisher = await createTestPublisher({ moderator: true });
    const { token } = await createTestUser({ publishers: [publisher.id], role: "user" });

    const response = await request(app).get(`/user/refresh?publisherId=${publisher.id}`).set("Authorization", `jwt ${token}`);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(recorder.records).toHaveLength(0);
  });
});
