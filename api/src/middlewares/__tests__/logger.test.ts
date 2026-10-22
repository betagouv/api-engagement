import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import logger from "@/middlewares/logger";

const logsFor = async (path: string, body: object) => {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const app = express();
  app.use(express.json());
  app.use(logger);
  app.post(path, (_req, res) => res.sendStatus(200));
  await request(app).post(path).send(body);
  const lines = write.mock.calls.map(([chunk]) => String(chunk)).filter((line) => line.includes(`"path":"${path}"`));
  write.mockRestore();
  return lines.join("");
};

describe("httpLogger", () => {
  afterEach(() => vi.restoreAllMocks());

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
