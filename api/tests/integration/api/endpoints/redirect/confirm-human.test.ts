import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "@/db/postgres";
import { createTrackingToken } from "@/utils/redirect";
import { createClickStat } from "../../../../fixtures/stat-event";
import { createTestApp } from "../../../../testApp";

const app = createTestApp();

describe("RedirectController /:statsId/confirm-human", () => {
  it("refuses a confirmation without a token and leaves the stat unchanged", async () => {
    const click = await createClickStat(randomUUID(), { isHuman: false });

    const response = await request(app).get(`/r/${click._id}/confirm-human`);

    expect(response.status).toBe(400);
    expect((await prisma.statEvent.findUnique({ where: { id: click._id } }))?.isHuman).toBe(false);
  });

  it("refuses a token issued for another stat and leaves the target unchanged", async () => {
    const click = await createClickStat(randomUUID(), { isHuman: false });

    const response = await request(app)
      .get(`/r/${click._id}/confirm-human`)
      .query({ token: createTrackingToken(randomUUID()) });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ ok: false, code: "FORBIDDEN" });
    expect((await prisma.statEvent.findUnique({ where: { id: click._id } }))?.isHuman).toBe(false);
  });

  it("confirms only the stat identified by a valid token", async () => {
    const click = await createClickStat(randomUUID(), { isHuman: false });

    const response = await request(app)
      .get(`/r/${click._id}/confirm-human`)
      .query({ token: createTrackingToken(click._id) });

    expect(response.status).toBe(200);
    expect((await prisma.statEvent.findUnique({ where: { id: click._id } }))?.isHuman).toBe(true);
  });
});
