import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendTemplate = vi.hoisted(() => {
  process.env.ALERTS_WEBHOOK_TOKEN = "test-alerts-token";
  process.env.ALERTS_BREVO_TEMPLATE_ID = "42";
  return vi.fn().mockResolvedValue({ ok: true });
});
vi.mock("@/services/brevo/email", () => ({ sendTemplate }));

import { prisma } from "@/db/postgres";
import { warningService } from "@/services/warning";
import { warningAlertService } from "@/services/warning-alert";
import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();
const TYPE = "TRACKING_WARNING";
const webhook = (alerts: unknown[], token = "test-alerts-token") => request(app).post("/warning/webhook").set("Authorization", `Bearer ${token}`).send({ alerts });

describe("Warning alerting", () => {
  let publisherId: string;
  let deploymentUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    sendTemplate.mockClear();
    deploymentUser = await createTestUser({ role: "admin" });
    const publisher = await createTestPublisher({ isAnnonceur: true, deploymentUserId: deploymentUser.user.id });
    publisherId = publisher.id;
  });

  it("rejects the webhook without a valid token", async () => {
    const res = await webhook([{ type: TYPE, publisherId }], "wrong");
    expect(res.status).toBe(401);
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it("creates the alert, assigns the deployment user and notifies once", async () => {
    const first = await webhook([{ type: TYPE, publisherId, title: "Plus de candidatures", procedureUrl: "https://notion.so/proc" }]);
    expect(first.body.data).toEqual({ created: 1, updated: 0, unknownPublishers: [] });

    const [warning] = await warningService.findWarnings({ publisherId });
    expect(warning).toMatchObject({ status: "TODO", fixed: false, occurrences: 1, procedureUrl: "https://notion.so/proc" });
    expect(warning.assignees.map((a) => a.id)).toEqual([deploymentUser.user.id]);
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate.mock.calls[0][1].subject).toContain(`[ALERTE:${warning.id}]`);

    const second = await webhook([{ type: TYPE, publisherId }]);
    expect(second.body.data).toEqual({ created: 0, updated: 1, unknownPublishers: [] });
    expect((await warningService.findWarningById(warning.id))?.occurrences).toBe(2);
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  it("reports unknown publishers", async () => {
    const res = await webhook([{ type: TYPE, publisherId: "does-not-exist" }]);
    expect(res.body.data).toEqual({ created: 0, updated: 0, unknownPublishers: ["does-not-exist"] });
  });

  it("lets an assignee change the status and keeps `fixed` in sync, but not a stranger", async () => {
    await webhook([{ type: TYPE, publisherId }]);
    const [warning] = await warningService.findWarnings({ publisherId });
    const stranger = await createTestUser({ role: "user" });

    const forbidden = await request(app).put(`/warning/${warning.id}/status`).set("Authorization", `jwt ${stranger.token}`).send({ status: "RESOLVED" });
    expect(forbidden.status).toBe(403);

    const inProgress = await request(app).put(`/warning/${warning.id}/status`).set("Authorization", `jwt ${deploymentUser.token}`).send({ status: "IN_PROGRESS" });
    expect(inProgress.body.data).toMatchObject({ status: "IN_PROGRESS", fixed: false, fixedAt: null });

    const resolved = await request(app).put(`/warning/${warning.id}/status`).set("Authorization", `jwt ${deploymentUser.token}`).send({ status: "RESOLVED" });
    expect(resolved.body.data).toMatchObject({ status: "RESOLVED", fixed: true });
    expect(resolved.body.data.fixedAt).not.toBeNull();
  });

  it("notifies only the newly assigned users", async () => {
    await webhook([{ type: TYPE, publisherId }]);
    const [warning] = await warningService.findWarnings({ publisherId });
    const other = await createTestUser({ role: "user" });
    sendTemplate.mockClear();

    const res = await request(app)
      .put(`/warning/${warning.id}/assignees`)
      .set("Authorization", `jwt ${deploymentUser.token}`)
      .send({ userIds: [deploymentUser.user.id, other.user.id] });

    expect(res.status).toBe(200);
    expect(res.body.data.assignees).toHaveLength(2);
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate.mock.calls[0][1].emailTo).toEqual([other.user.email]);
  });

  it("resolves the alert on an email reply from an assignee only", async () => {
    await webhook([{ type: TYPE, publisherId }]);
    const [warning] = await warningService.findWarnings({ publisherId });
    const subject = `Re: [Alerte] Test [ALERTE:${warning.id}]`;
    const stranger = await createTestUser({ role: "user" });

    expect(await warningAlertService.handleEmailReply(subject, stranger.user.email)).toBe(false);
    expect((await warningService.findWarningById(warning.id))?.status).toBe("TODO");

    expect(await warningAlertService.handleEmailReply(subject, deploymentUser.user.email)).toBe(true);
    expect(await warningService.findWarningById(warning.id)).toMatchObject({ status: "RESOLVED", fixed: true });
    expect(await warningAlertService.handleEmailReply("Rapport LinkedIn", deploymentUser.user.email)).toBe(false);
  });

  describe("complex scenarios (S4)", () => {
    it("deduplicates repeated alerts into a single open alert and notifies once", async () => {
      for (let i = 0; i < 10; i++) {
        await webhook([{ type: TYPE, publisherId }]);
      }
      const warnings = await warningService.findWarnings({ publisherId });
      expect(warnings).toHaveLength(1);
      expect(warnings[0].occurrences).toBe(10);
      expect(sendTemplate).toHaveBeenCalledTimes(1);
    });

    it("opens a new alert and notifies again when the problem comes back after a resolution", async () => {
      await webhook([{ type: TYPE, publisherId }]);
      const [first] = await warningService.findWarnings({ publisherId });
      await warningService.updateWarning(first.id, { status: "RESOLVED" });

      const res = await webhook([{ type: TYPE, publisherId }]);
      expect(res.body.data.created).toBe(1);
      expect(await warningService.findWarnings({ publisherId })).toHaveLength(2);
      expect(sendTemplate).toHaveBeenCalledTimes(2);
    });

    it("groups the alerts of one advertiser (several types) while keeping them separate", async () => {
      await webhook([
        { type: TYPE, publisherId },
        { type: "IMPORT_WARNING", publisherId },
      ]);
      const res = await request(app).post("/warning/search").set("Authorization", `jwt ${deploymentUser.token}`).send({ publisherId, fixed: false });
      expect(res.body.data.map((w: { type: string }) => w.type).sort()).toEqual(["IMPORT_WARNING", TYPE]);
      // Pas de notion d'incident : un mail par alerte (pas de regroupement)
      expect(sendTemplate).toHaveBeenCalledTimes(2);
    });

    it("escalates untreated alerts once, ignoring those already in progress or too recent", async () => {
      await webhook([
        { type: TYPE, publisherId },
        { type: "IMPORT_WARNING", publisherId },
        { type: "BOT_WARNING", publisherId },
      ]);
      const all = await warningService.findWarnings({ publisherId });
      const byType = (type: string) => all.find((w) => w.type === type)!;
      const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
      await prisma.warning.updateMany({ where: { id: { in: [byType(TYPE).id, byType("IMPORT_WARNING").id] } }, data: { createdAt: old } });
      await warningService.updateWarning(byType("IMPORT_WARNING").id, { status: "IN_PROGRESS" });
      sendTemplate.mockClear();

      expect(await warningAlertService.escalate(24)).toBe(1);
      expect(sendTemplate).toHaveBeenCalledTimes(1);
      expect(sendTemplate.mock.calls[0][1].subject).toMatch(/^\[Relance\]/);
      expect((await warningService.findWarningById(byType(TYPE).id))?.escalatedAt).not.toBeNull();

      expect(await warningAlertService.escalate(24)).toBe(0);
    });
  });
});
