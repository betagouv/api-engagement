import request from "supertest";
import { describe, expect, it } from "vitest";

import { createTestPublisher } from "../../fixtures";
import { createTestReport } from "../../fixtures/report";
import { createTestApp } from "../../testApp";

const app = createTestApp();

const SIGNED_URL = "https://mock-bucket.example.com/signed-url?token=mock";

describe("Report endpoints (integration)", () => {
  describe("GET /report/:id", () => {
    it("redirects to a presigned URL when objectName is set", async () => {
      const publisher = await createTestPublisher();
      const report = await createTestReport({ publisherId: publisher.id, objectName: `publishers/${publisher.id}/reports/202501.pdf` });

      const res = await request(app).get(`/report/${report.id}`).redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(SIGNED_URL);
    });

    it("redirects to report.url when objectName is null (legacy fallback)", async () => {
      const publisher = await createTestPublisher();
      const legacyUrl = `https://bucket.example.com/publishers/${publisher.id}/reports/202501.pdf`;
      const report = await createTestReport({ publisherId: publisher.id, objectName: null, url: legacyUrl });

      const res = await request(app).get(`/report/${report.id}`).redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(legacyUrl);
    });

    it("returns 404 when the report does not exist", async () => {
      const res = await request(app).get("/report/00000000-0000-0000-0000-000000000000");

      expect(res.status).toBe(404);
    });

    it("returns 400 for an invalid UUID", async () => {
      const res = await request(app).get("/report/not-a-uuid");

      expect(res.status).toBe(400);
    });
  });
});
