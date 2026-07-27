import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import * as error from "@/error";
import { createTrackingToken } from "@/utils/redirect";
import { createClickStat } from "../../../../fixtures/stat-event";
import { createTestApp } from "../../../../testApp";

const app = createTestApp();

describe("RedirectController /:statsId/confirm-human", () => {
  it("confirms a legacy request without a token and reports it to Sentry", async () => {
    const click = await createClickStat(randomUUID(), { isHuman: false });
    const captureExceptionSpy = vi.spyOn(error, "captureException");

    const response = await request(app).get(`/r/${click._id}/confirm-human`);

    expect(response.status).toBe(200);
    expect((await prisma.statEvent.findUnique({ where: { id: click._id } }))?.isHuman).toBe(true);
    expect(captureExceptionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: "[Tracking] Confirmation received without tracking token" }),
      expect.objectContaining({ extra: expect.objectContaining({ statsId: click._id }) })
    );
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
