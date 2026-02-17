import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../../testApp";

describe("Routing", () => {
  const app = createTestApp();

  describe("Unknown routes", () => {
    it("should return 404 for unknown GET route", async () => {
      const response = await request(app).get("/jeecg-boot/jmreport/show");
      expect(response.status).toBe(404);
    });

    it("should return 404 for unknown POST route", async () => {
      const response = await request(app)
        .post("/jeecg-boot/jmreport/show")
        .send({ id: "test" });
      expect(response.status).toBe(404);
    });
  });

  describe("Invalid JSON body", () => {
    it("should return 400 for malformed JSON", async () => {
      const response = await request(app)
        .post("/v0/mission")
        .set("Content-Type", "application/json")
        .send('{"invalid json}');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ ok: false, code: "INVALID_BODY" });
    });

    it("should return 400 for exploit payload with malformed JSON", async () => {
      const payload =
        '{"id":"961455b47c0b86dc961e90b5893bff05","apiUrl":"","params":"{"id":"1\' or \'%1%\' like (updatexml(0x3a,concat(1,(version())),1)) or \'%%\' like \'"}"}';
      const response = await request(app)
        .post("/jeecg-boot/jmreport/show")
        .set("Content-Type", "application/json")
        .send(payload);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ ok: false, code: "INVALID_BODY" });
    });
  });

  describe("Valid routes still work", () => {
    it("should not return 404 for known route prefix", async () => {
      const response = await request(app).get("/v0/mission");
      expect(response.status).not.toBe(404);
    });
  });
});
