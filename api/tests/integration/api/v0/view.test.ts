import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

describe("View API Integration Tests", () => {
  const app = createTestApp();

  let apiKey: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ name: "View Publisher" });
    apiKey = publisher.apikey!;
  });

  it("returns 410 Gone (deprecated)", async () => {
    const response = await request(app).get("/v0/view/stats").set("x-api-key", apiKey);

    expect(response.status).toBe(410);
    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("DEPRECATED");
  });
});
