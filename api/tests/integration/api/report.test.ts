import request from "supertest";
import { describe, expect, it } from "vitest";

import { createTestPublisher } from "../../fixtures";
import { createTestReport } from "../../fixtures/report";
import { createTestUser } from "../../fixtures/user";
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

  describe("GET /report/pdf/:publisherId", () => {
    it("returns 401 without a JWT token", async () => {
      const publisher = await createTestPublisher();

      const res = await request(app).get(`/report/pdf/${publisher.id}`);

      expect(res.status).toBe(401);
    });

    it("returns 403 when the user does not belong to the publisher", async () => {
      const publisher = await createTestPublisher();
      const { token } = await createTestUser({ publishers: [] });
      await createTestReport({ publisherId: publisher.id, month: new Date().getMonth(), year: new Date().getFullYear() });

      const res = await request(app).get(`/report/pdf/${publisher.id}`).set("Authorization", `jwt ${token}`);

      expect(res.status).toBe(403);
    });

    it("redirects to a presigned URL when the user belongs to the publisher", async () => {
      const publisher = await createTestPublisher();
      const { token } = await createTestUser({ publishers: [publisher.id] });
      await createTestReport({ publisherId: publisher.id, month: new Date().getMonth(), year: new Date().getFullYear() });

      const res = await request(app).get(`/report/pdf/${publisher.id}`).set("Authorization", `jwt ${token}`).redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(SIGNED_URL);
    });

    it("redirects to a presigned URL when the user is admin", async () => {
      const publisher = await createTestPublisher();
      const { token } = await createTestUser({ role: "admin", publishers: [] });
      await createTestReport({ publisherId: publisher.id, month: new Date().getMonth(), year: new Date().getFullYear() });

      const res = await request(app).get(`/report/pdf/${publisher.id}`).set("Authorization", `jwt ${token}`).redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(SIGNED_URL);
    });

    it("returns 404 when no report exists for the publisher and period", async () => {
      const publisher = await createTestPublisher();
      const { token } = await createTestUser({ publishers: [publisher.id] });

      const res = await request(app).get(`/report/pdf/${publisher.id}?year=2000&month=0`).set("Authorization", `jwt ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
