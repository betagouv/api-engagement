import request from "supertest";
import { describe, expect, it } from "vitest";

import { createTestPublisher } from "../../fixtures";
import { createTestReport } from "../../fixtures/report";
import { createTestApp } from "../../testApp";

const app = createTestApp();

describe("Report endpoints (integration)", () => {
  describe("GET /report/:id", () => {
    it("returns 410 Gone for an existing report (endpoint decommissioned)", async () => {
      const publisher = await createTestPublisher();
      const report = await createTestReport({ publisherId: publisher.id, objectName: `publishers/${publisher.id}/reports/202501.pdf` });

      const res = await request(app).get(`/report/${report.id}`).redirects(0);

      expect(res.status).toBe(410);
      expect(res.body.ok).toBe(false);
    });

    it("returns 410 Gone for any id, regardless of existence", async () => {
      const res = await request(app).get("/report/00000000-0000-0000-0000-000000000000").redirects(0);

      expect(res.status).toBe(410);
    });
  });
});
