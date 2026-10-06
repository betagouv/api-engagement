import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import responseCompression from "@/middlewares/compression";

const createApp = () => {
  const app = express();
  app.use(responseCompression);
  app.get("/large-response", (_req, res) => res.json({ value: "a".repeat(2_000) }));
  app.get("/small-response", (_req, res) => res.json({ value: "small" }));
  return app;
};

describe("responseCompression", () => {
  it("compresse une réponse volumineuse lorsque le client accepte gzip", async () => {
    const response = await request(createApp()).get("/large-response").set("Accept-Encoding", "gzip");

    expect(response.headers["content-encoding"]).toBe("gzip");
    expect(response.headers.vary).toContain("Accept-Encoding");
  });

  it("ne compresse pas une petite réponse", async () => {
    const response = await request(createApp()).get("/small-response").set("Accept-Encoding", "gzip");

    expect(response.headers["content-encoding"]).toBeUndefined();
  });
});
