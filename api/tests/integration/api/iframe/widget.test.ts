import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { PublisherRecord, WidgetRecord } from "@/types";
import { createTestPublisher, createTestWidget } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

describe("GET /iframe/widget", () => {
  const app = createTestApp();
  let widget: WidgetRecord;
  let publisher: PublisherRecord;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    widget = await createTestWidget({
      name: "Test Widget Name",
      fromPublisher: publisher,
      publishers: [publisher.id],
      jvaModeration: true,
      type: "benevolat",
    });
  });

  describe("Response format", () => {
    it("should return 200 with correct structure when fetching by id", async () => {
      const response = await request(app).get("/iframe/widget").query({ id: widget.id }).expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.any(Object),
      });
    });

    it("should return 200 with correct structure when fetching by name", async () => {
      const response = await request(app).get("/iframe/widget").query({ name: widget.name }).expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.any(Object),
      });
    });

    it("should return widget with all required properties", async () => {
      const response = await request(app).get("/iframe/widget").query({ id: widget.id }).expect(200);

      const data = response.body.data;
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("color");
      expect(data).toHaveProperty("style");
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("publishers");
      expect(data).toHaveProperty("rules");
      expect(data).toHaveProperty("jvaModeration");
      expect(data).toHaveProperty("fromPublisherId");
      expect(data).toHaveProperty("active");
      expect(data).toHaveProperty("createdAt");
      expect(data).toHaveProperty("updatedAt");
    });

    it("should return 400 with INVALID_QUERY when neither id nor name provided", async () => {
      const response = await request(app).get("/iframe/widget").expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        code: "INVALID_QUERY",
      });
    });

    it("should return 404 with NOT_FOUND when widget does not exist", async () => {
      const response = await request(app).get("/iframe/widget").query({ id: "non-existent-id" }).expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });
  });

  describe("Correct data retrieval", () => {
    it("should return correct widget when fetching by id", async () => {
      const response = await request(app).get("/iframe/widget").query({ id: widget.id }).expect(200);

      expect(response.body.data.id).toBe(widget.id);
      expect(response.body.data.name).toBe(widget.name);
      expect(response.body.data.jvaModeration).toBe(true);
      expect(response.body.data.type).toBe("benevolat");
    });

    it("should return correct widget when fetching by name", async () => {
      const response = await request(app).get("/iframe/widget").query({ name: widget.name }).expect(200);

      expect(response.body.data.id).toBe(widget.id);
      expect(response.body.data.name).toBe(widget.name);
    });

    it("should include widget publishers", async () => {
      const response = await request(app).get("/iframe/widget").query({ id: widget.id }).expect(200);

      expect(response.body.data.publishers).toEqual([publisher.id]);
    });

    it("should include widget rules", async () => {
      const widgetWithRules = await createTestWidget({
        fromPublisher: publisher,
        rules: [
          {
            combinator: "and",
            field: "domain",
            fieldType: "string",
            operator: "is",
            value: "environment",
          },
        ],
      });

      const response = await request(app).get("/iframe/widget").query({ id: widgetWithRules.id }).expect(200);

      expect(response.body.data.rules).toHaveLength(1);
      expect(response.body.data.rules[0]).toMatchObject({
        field: "domain",
        operator: "is",
        value: "environment",
      });
    });
  });

  describe("Error cases", () => {
    it("should return 404 for non-existent name", async () => {
      const response = await request(app).get("/iframe/widget").query({ name: "Non Existent Widget" }).expect(404);

      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 400 when query is malformed", async () => {
      const response = await request(app).get("/iframe/widget").expect(400);

      expect(response.body.code).toBe("INVALID_QUERY");
    });
  });
});
