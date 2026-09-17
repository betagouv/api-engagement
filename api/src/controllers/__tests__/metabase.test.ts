import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import metabaseRouter from "@/controllers/metabase";
import { metabaseService } from "@/services/metabase";

vi.mock("passport", () => ({
  default: {
    authenticate: (_strategy: string, _options: unknown, callback: (error: unknown, user?: unknown) => void) =>
      (req: express.Request) => callback(null, req.headers.authorization ? { role: "user", publishers: ["own-publisher"] } : undefined),
  },
}));

vi.mock("@/middlewares/rate-limit", () => ({
  ipRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock("@/services/metabase", () => ({
  metabaseService: { queryCard: vi.fn() },
}));

const app = express();
app.use(express.json());
app.use("/metabase", metabaseRouter);

describe("POST /metabase/card/:cardId/query", () => {
  beforeEach(() => {
    vi.mocked(metabaseService.queryCard).mockResolvedValue({ ok: true, status: 200, data: { rows: [] } });
  });

  it("transmet uniquement le publisher autorisé", async () => {
    const response = await request(app)
      .post("/metabase/card/5494/query")
      .set("Authorization", "jwt test")
      .send({ variables: { publisher_id: " own-publisher " } });

    expect(response.status).toBe(200);
    expect(metabaseService.queryCard).toHaveBeenCalledWith("5494", { variables: { publisher_id: "own-publisher" } });
  });

  it("refuse des paramètres qui remplaceraient le publisher autorisé", async () => {
    const response = await request(app)
      .post("/metabase/card/5494/query")
      .set("Authorization", "jwt test")
      .send({
        variables: { publisher_id: "own-publisher" },
        parameters: [{ target: ["variable", ["template-tag", "publisher_id"]], value: ["other-publisher"] }],
      });

    expect(response.status).toBe(400);
    expect(metabaseService.queryCard).not.toHaveBeenCalled();
  });

  it("refuse un publisher_id sous forme de tableau", async () => {
    const response = await request(app)
      .post("/metabase/card/5494/query")
      .set("Authorization", "jwt test")
      .send({ variables: { publisher_id: ["other-publisher"] } });

    expect(response.status).toBe(403);
    expect(metabaseService.queryCard).not.toHaveBeenCalled();
  });

  it("refuse un publisher différent de celui de l'utilisateur", async () => {
    const response = await request(app)
      .post("/metabase/card/5494/query")
      .set("Authorization", "jwt test")
      .send({ variables: { publisher_id: "other-publisher" } });

    expect(response.status).toBe(403);
    expect(metabaseService.queryCard).not.toHaveBeenCalled();
  });

  it("refuse le corps Metabase libre sur une carte publique", async () => {
    const response = await request(app).post("/metabase/card/5525/query").send({ body: { parameters: [] } });

    expect(response.status).toBe(400);
    expect(metabaseService.queryCard).not.toHaveBeenCalled();
  });
});
