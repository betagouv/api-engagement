import type { PublisherRecord } from "@/types/publisher";
import type { WidgetRecord } from "@/types/widget";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestMission, createTestPublisher, createTestWidget } from "../../../../fixtures";
import { createTestApp } from "../../../../testApp";

describe("GET /iframe/:id/aggs", () => {
  const app = createTestApp();
  let widget: WidgetRecord;
  let publisher: PublisherRecord;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    widget = await createTestWidget({
      fromPublisher: publisher,
      publishers: [publisher.id],
      type: "benevolat",
    });

    // Create missions with different characteristics
    await createTestMission({
      publisherId: publisher.id,
      title: "Mission Environnement 1",
      domain: "Environnement",
      organizationClientId: "green-org-1",
      organizationName: "Green Org",
      departmentCode: "75",
      departmentName: "Paris",
      remote: "no",
      openToMinors: true,
      schedule: "1 jour par semaine",
      country: "FR",
    });

    await createTestMission({
      publisherId: publisher.id,
      title: "Mission Environnement 2",
      domain: "Environnement",
      organizationClientId: "green-org-1",
      organizationName: "Green Org",
      departmentCode: "75",
      departmentName: "Paris",
      remote: "full",
      openToMinors: false,
      schedule: "2 jours par semaine",
      country: "FR",
    });

    await createTestMission({
      publisherId: publisher.id,
      title: "Mission Éducation",
      domain: "Éducation",
      organizationClientId: "edu-org-1",
      organizationName: "Edu Org",
      departmentCode: "69",
      departmentName: "Rhône",
      remote: "possible",
      openToMinors: true,
      schedule: "Temps plein",
      country: "FR",
    });

    await createTestMission({
      publisherId: publisher.id,
      title: "Mission Santé",
      domain: "Santé",
      organizationClientId: "health-org-1",
      organizationName: "Health Org",
      departmentCode: "13",
      departmentName: "Bouches-du-Rhône",
      remote: "no",
      openToMinors: false,
      schedule: "1 jour par semaine",
      country: "FR",
      reducedMobilityAccessible: true,
      closeToTransport: true,
    });
  });

  describe("Response format", () => {
    it("should return 200 with correct structure", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.any(Object),
      });
    });

    it("should include CORS header", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe("*");
    });

    it("should return default aggregations", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      const { data } = response.body;
      expect(data).toHaveProperty("domain");
      expect(data).toHaveProperty("organization");
      expect(data).toHaveProperty("department");
      expect(data).toHaveProperty("remote");
      expect(data).toHaveProperty("country");
    });

    it("should return aggregations as arrays", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      const { data } = response.body;
      expect(Array.isArray(data.domain)).toBe(true);
      expect(Array.isArray(data.organization)).toBe(true);
      expect(Array.isArray(data.department)).toBe(true);
      expect(Array.isArray(data.remote)).toBe(true);
      expect(Array.isArray(data.country)).toBe(true);
    });

    it("should return 404 when widget does not exist", async () => {
      const response = await request(app).get("/iframe/507f1f77bcf86cd799439011/aggs").expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });
  });

  describe("Default aggregations", () => {
    it("should aggregate by domain with correct counts", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      const domains = response.body.data.domain;
      expect(domains).toBeDefined();

      const environnement = domains.find((d: any) => d.key === "Environnement");
      expect(environnement).toBeDefined();
      expect(environnement.doc_count).toBe(2);

      const education = domains.find((d: any) => d.key === "Éducation");
      expect(education).toBeDefined();
      expect(education.doc_count).toBe(1);
    });

    it("should aggregate by organization with correct counts", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      const organizations = response.body.data.organization;
      expect(organizations).toBeDefined();
      expect(Array.isArray(organizations)).toBe(true);
    });

    it("should aggregate by department with correct counts", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      const departments = response.body.data.department;
      expect(departments).toBeDefined();

      const paris = departments.find((d: any) => d.key === "Paris");
      expect(paris).toBeDefined();
      expect(paris.doc_count).toBe(2);
    });

    it("should aggregate by remote with correct counts", async () => {
      await createTestMission({
        publisherId: publisher.id,
        title: "Mission Locale",
        domain: "Environnement",
        remote: "local",
      });

      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      const remote = response.body.data.remote;
      expect(remote).toBeDefined();

      const noRemote = remote.find((r: any) => r.key === "no");
      expect(noRemote).toBeDefined();
      expect(noRemote.doc_count).toBe(2);

      const fullRemote = remote.find((r: any) => r.key === "full");
      expect(fullRemote).toBeDefined();
      expect(fullRemote.doc_count).toBe(1);

      const localRemote = remote.find((r: any) => r.key === "local");
      expect(localRemote).toBeDefined();
      expect(localRemote.doc_count).toBe(1);
    });

    it("should aggregate by country with correct counts", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).expect(200);

      const countries = response.body.data.country;
      expect(countries).toBeDefined();

      const france = countries.find((c: any) => c.key === "FR");
      expect(france).toBeDefined();
      expect(france.doc_count).toBe(4);
    });

    it("should aggregate local missions without address when filtering on-site missions around a widget location", async () => {
      const geoWidget = await createTestWidget({
        fromPublisher: publisher,
        publishers: [publisher.id],
        location: { lat: 48.8566, lon: 2.3522 },
        distance: "25km",
      });
      await createTestMission({
        publisherId: publisher.id,
        title: "Mission Présentiel Paris",
        domain: "Environnement",
        remote: "no",
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
      await createTestMission({
        publisherId: publisher.id,
        title: "Mission Locale sans adresse",
        domain: "Environnement",
        remote: "local",
        addresses: [],
      });

      const response = await request(app).get(`/iframe/${geoWidget.id}/aggs`).query({ remote: "no" }).expect(200);

      const remote = response.body.data.remote;
      const noRemote = remote.find((r: any) => r.key === "no");
      const localRemote = remote.find((r: any) => r.key === "local");
      expect(noRemote).toBeDefined();
      expect(noRemote.doc_count).toBe(1);
      expect(localRemote).toBeDefined();
      expect(localRemote.doc_count).toBe(1);
    });

    it("should aggregate local missions without address around a widget location without remote filter", async () => {
      const geoWidget = await createTestWidget({
        fromPublisher: publisher,
        publishers: [publisher.id],
        location: { lat: 48.8566, lon: 2.3522 },
        distance: "25km",
      });
      await createTestMission({
        publisherId: publisher.id,
        title: "Mission Présentiel Paris",
        domain: "Environnement",
        remote: "no",
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
      await createTestMission({
        publisherId: publisher.id,
        title: "Mission Locale sans adresse",
        domain: "Environnement",
        remote: "local",
        addresses: [],
      });

      const response = await request(app).get(`/iframe/${geoWidget.id}/aggs`).expect(200);

      const remote = response.body.data.remote;
      const noRemote = remote.find((r: any) => r.key === "no");
      const localRemote = remote.find((r: any) => r.key === "local");
      expect(noRemote).toBeDefined();
      expect(noRemote.doc_count).toBe(1);
      expect(localRemote).toBeDefined();
      expect(localRemote.doc_count).toBe(1);
    });
  });

  describe("Error cases", () => {
    it("should return 400 for invalid lat parameter", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).query({ lat: 100 }).expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });

    it("should return 400 for invalid lon parameter", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).query({ lon: 200 }).expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });

    it("should return 400 for invalid duration parameter", async () => {
      const response = await request(app).get(`/iframe/${widget.id}/aggs`).query({ duration: -5 }).expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });
  });
});
