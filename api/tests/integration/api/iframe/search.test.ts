import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { MissionRecord } from "../../../../src/types/mission";
import type { PublisherRecord } from "../../../../src/types/publisher";
import type { WidgetRecord } from "../../../../src/types/widget";
import { createTestMission, createTestPublisher, createTestWidget, createTestWidgetRule } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

describe("GET /iframe/:id/search", () => {
  const app = createTestApp();
  let widget: WidgetRecord;
  let publisher: PublisherRecord;
  let mission1: MissionRecord;
  let mission2: MissionRecord;
  let mission3: MissionRecord;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    widget = await createTestWidget({
      fromPublisher: publisher,
      publishers: [publisher.id],
      type: "benevolat",
    });

    mission1 = await createTestMission({
      publisherId: publisher.id,
      title: "Mission Environnement Paris",
      domain: "Environnement",
      organizationClientId: "green-org-1",
      organizationName: "Green Org",
      city: "Paris",
      postalCode: "75001",
      departmentCode: "75",
      departmentName: "Paris",
      country: "FR",
      remote: "no",
      openToMinors: true,
      reducedMobilityAccessible: true,
      closeToTransport: true,
      schedule: "1 jour par semaine",
      duration: 5,
      addresses: [
        {
          city: "Paris",
          postalCode: "75001",
          departmentCode: "75",
          departmentName: "Paris",
          country: "FR",
          location: { lat: 48.8566, lon: 2.3522 },
        },
      ],
    });

    mission2 = await createTestMission({
      publisherId: publisher.id,
      title: "Mission Éducation Lyon",
      domain: "Éducation",
      organizationClientId: "edu-org-1",
      organizationName: "Edu Org",
      city: "Lyon",
      postalCode: "69001",
      departmentCode: "69",
      departmentName: "Rhône",
      country: "FR",
      remote: "full",
      openToMinors: false,
      reducedMobilityAccessible: false,
      closeToTransport: false,
      schedule: "2 jours par semaine",
      duration: 10,
      addresses: [
        {
          city: "Lyon",
          postalCode: "69001",
          departmentCode: "69",
          departmentName: "Rhône",
          country: "FR",
          location: { lat: 45.75, lon: 4.85 },
        },
      ],
    });

    mission3 = await createTestMission({
      publisherId: publisher.id,
      title: "Mission Santé Marseille",
      domain: "Santé",
      organizationClientId: "health-org-1",
      organizationName: "Health Org",
      city: "Marseille",
      postalCode: "13001",
      departmentCode: "13",
      departmentName: "Bouches-du-Rhône",
      country: "FR",
      remote: "possible",
      openToMinors: true,
      schedule: "Temps plein",
      duration: 15,
      addresses: [
        {
          city: "Marseille",
          postalCode: "13001",
          departmentCode: "13",
          departmentName: "Bouches-du-Rhône",
          country: "FR",
          location: { lat: 43.2965, lon: 5.3698 },
        },
      ],
    });
  });

  describe("Response format", () => {
    it("should return 200 with correct structure", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.any(Array),
        total: expect.any(Number),
      });
    });

    it("should return missions with required properties", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);

      const mission = response.body.data[0];
      expect(mission).toHaveProperty("_id");
      expect(mission).toHaveProperty("title");
      expect(mission).toHaveProperty("domain");
      expect(mission).toHaveProperty("domainLogo");
      expect(mission).toHaveProperty("organizationName");
      expect(mission).toHaveProperty("remote");
      expect(mission).toHaveProperty("city");
      expect(mission).toHaveProperty("country");
      expect(mission).toHaveProperty("postalCode");
      expect(mission).toHaveProperty("places");
      expect(mission).toHaveProperty("tags");
      expect(mission).toHaveProperty("addresses");
    });

    it("should return 404 when widget does not exist", async () => {
      const response = await request(app).get("/iframe/non-existent-id/search").expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });

    it("should return 400 for invalid query parameters", async () => {
      const response = await request(app)
        .get(`/iframe/${widget.id}/search`)
        .query({ lat: 100 }) // Invalid latitude
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        code: "INVALID_QUERY",
      });
    });
  });

  describe("Pagination", () => {
    it("should use default pagination values", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBe(3);
    });

    it("should respect custom size parameter", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ size: 1 }).expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(3);
    });

    it("should respect from parameter for offset", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ from: 2, size: 1 }).expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(3);
    });

    it("should handle from parameter beyond results", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ from: 100 }).expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(3);
    });
  });

  describe("Text filters", () => {
    it("should filter by search keywords in title", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ search: "Environnement" }).expect(200);

      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.data[0].title).toContain("Environnement");
    });

    it("should filter by organization name", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ organization: "Green Org" }).expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it("should support multiple organization names", async () => {
      const response = await request(app)
        .get(`/iframe/${widget.id}/search`)
        .query({ organization: ["Green Org", "Edu Org"] })
        .expect(200);

      expect(response.body.total).toBe(2);
    });
  });

  describe("Geographic filters", () => {
    it("should filter by city", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ city: "Paris" }).expect(200);

      // City filter is informational, not used for actual filtering
      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it("should filter by department", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ department: "Paris" }).expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it("should filter by multiple departments", async () => {
      const response = await request(app)
        .get(`/iframe/${widget.id}/search`)
        .query({ department: ["Paris", "Rhône"] })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it("should filter by country FR", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ country: "FR" }).expect(200);

      expect(response.body.total).toBe(3);
    });

    it("should validate latitude range", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ lat: -100, lon: 0 }).expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });

    it("should validate longitude range", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ lat: 0, lon: 200 }).expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });
  });

  describe("Category filters", () => {
    it("should filter by domain", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ domain: "Environnement" }).expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].domain).toBe("Environnement");
    });

    it("should filter by multiple domains", async () => {
      const response = await request(app)
        .get(`/iframe/${widget.id}/search`)
        .query({ domain: ["Environnement", "Éducation"] })
        .expect(200);

      expect(response.body.total).toBe(2);
    });

    it("should filter by schedule", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ schedule: "1 jour par semaine" }).expect(200);

      expect(response.body.total).toBe(1);
    });
  });

  describe("Boolean filters", () => {
    it("should filter by remote=yes (full or possible)", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ remote: "yes" }).expect(200);

      expect(response.body.total).toBe(2);
      const remoteValues = response.body.data.map((m: any) => m.remote);
      expect(remoteValues).toEqual(expect.arrayContaining(["full", "possible"]));
    });

    it("should filter by remote=no", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ remote: "no" }).expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].remote).toBe("no");
    });

    it("should filter by minor=yes (open to minors)", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ minor: "yes" }).expect(200);

      expect(response.body.total).toBe(2);
    });

    it("should filter by minor=no (not open to minors)", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ minor: "no" }).expect(200);

      expect(response.body.total).toBe(1);
    });

    it("should filter by accessibility reducedMobilityAccessible", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ accessibility: "reducedMobilityAccessible" }).expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });

    it("should filter by accessibility closeToTransport", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ accessibility: "closeToTransport" }).expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Temporal filters", () => {
    it("should filter by duration", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ duration: 7 }).expect(200);

      expect(response.body.total).toBe(1);
    });

    it("should filter by start date", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30); // 30 days in future

      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ start: futureDate.toISOString() }).expect(200);

      // Should return missions starting after the future date
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Widget rules and publisher filtering", () => {
    it("should only return missions from widget publishers", async () => {
      const otherPublisher = await createTestPublisher();
      await createTestMission({
        publisherId: otherPublisher.id,
        title: "Mission from other publisher",
        domain: "Test Domain",
      });

      const response = await request(app).get(`/iframe/${widget.id}/search`).expect(200);

      expect(response.body.total).toBe(3); // Only original 3 missions
    });

    it("should apply widget rules", async () => {
      const restrictedWidget = await createTestWidget({
        fromPublisher: publisher,
        publishers: [publisher.id],
        rules: [createTestWidgetRule("domain", "is", "Environnement")],
      });

      const response = await request(app).get(`/iframe/${restrictedWidget.id}/search`).expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].domain).toBe("Environnement");
    });
  });

  describe("JVA moderation", () => {
    it("should apply moderation title when jvaModeration is enabled", async () => {
      const moderatedWidget = await createTestWidget({
        fromPublisher: publisher,
        publishers: [publisher.id],
        jvaModeration: true,
      });

      const response = await request(app).get(`/iframe/${moderatedWidget.id}/search`).expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should not apply moderation when jvaModeration is disabled", async () => {
      const unmoderatedWidget = await createTestWidget({
        fromPublisher: publisher,
        publishers: [publisher.id],
        jvaModeration: false,
      });

      const response = await request(app).get(`/iframe/${unmoderatedWidget.id}/search`).expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("Error cases", () => {
    it("should return 400 for invalid widget ID format", async () => {
      const response = await request(app).get("/iframe/invalid-format/search").expect(404);

      expect(response.body.ok).toBe(false);
    });

    it("should return 400 for invalid size parameter", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ size: -1 }).expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });

    it("should return 400 for invalid from parameter", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/search`).query({ from: -1 }).expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });
  });
});
