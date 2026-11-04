import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import logger from "@/middlewares/logger";

const logsFor = async (path: string, body: object, headers: Record<string, string> = {}) => {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const app = express();
  app.use(express.json());
  app.use(logger);
  app.post(path, (_req, res) => res.sendStatus(200));
  await request(app).post(path).set(headers).send(body);
  const lines = write.mock.calls.map(([chunk]) => String(chunk)).filter((line) => line.includes(`"path":"${path}"`));
  write.mockRestore();
  return lines.join("");
};

describe("httpLogger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs only the origin of origin and referer request headers", async () => {
    const out = await logsFor("/other", {}, {
      Origin: "https://lacravatesolidaire.org/path?secret=value#fragment",
      Referer: "https://user:password@sc.api-engagement.beta.gouv.fr/missions?token=private#fragment",
    });
    expect(JSON.parse(out)).toMatchObject({
      origin: "https://lacravatesolidaire.org",
      referer_origin: "https://sc.api-engagement.beta.gouv.fr",
    });
    expect(out).not.toContain("secret");
    expect(out).not.toContain("private");
    expect(out).not.toContain("password");
    expect(out).not.toContain("fragment");
    expect(JSON.parse(out)).not.toHaveProperty("referer");
  });

  it("omits origin and referer when headers are absent", async () => {
    const out = await logsFor("/other", {});
    expect(JSON.parse(out)).not.toHaveProperty("origin");
    expect(JSON.parse(out)).not.toHaveProperty("referer_origin");
  });

  it.each(["invalid", "null", "javascript:alert(1)", "file:///private/path"])("omits invalid or non-HTTP origins: %s", async (value) => {
    const out = await logsFor("/other", {}, { Origin: value, Referer: value });
    expect(JSON.parse(out)).not.toHaveProperty("origin");
    expect(JSON.parse(out)).not.toHaveProperty("referer_origin");
  });

  it("logs the body of regular POST requests, redacting secrets", async () => {
    const out = await logsFor("/other", { name: "x", password: "secret" });
    expect(out).toContain('"name":"x"');
    expect(out).not.toContain("secret");
  });

  it("never logs the body of inbound emails", async () => {
    const out = await logsFor("/inbound-email", { items: [{ From: { Address: "me@example.com" }, RawTextBody: "contenu du mail" }] });
    expect(out).toContain('"path":"/inbound-email"');
    expect(out).not.toContain("me@example.com");
    expect(out).not.toContain("contenu du mail");
  });
});
