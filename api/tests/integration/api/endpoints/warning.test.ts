import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendTemplate = vi.hoisted(() => {
  process.env.ALERTS_WEBHOOK_TOKEN = "test-alerts-token";
  return vi.fn().mockResolvedValue({ ok: true });
});
vi.mock("@/services/brevo/email", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/services/brevo/email")>()), sendTemplate }));

import { prisma } from "@/db/postgres";
import { TEMPLATE_IDS } from "@/services/brevo/email";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();
const TYPE = "TRACKING_WARNING";

// Payload d'un canal webhook d'alerte Metabase (format documenté, graphique `visualization` omis)
const metabasePayload = (cols: unknown[], rows: unknown[][]) => ({
  type: "alert",
  alert_id: 12,
  alert_creator_id: 3,
  alert_creator_name: "Valentin",
  data: {
    type: "question",
    question_id: 108,
    question_name: "Arrêt de tracking des candidatures",
    question_url: "https://metabase.example/question/108",
    raw_data: { cols, rows },
  },
  sent_at: "2026-10-20T08:00:00Z",
});
const post = (body: unknown, token = "test-alerts-token") =>
  request(app)
    .post("/warning/webhook/metabase")
    .set("Authorization", `Bearer ${token}`)
    .send(body as object);

type TestAlert = { type: string; publisherId: string; title?: string; description?: string; procedureUrl?: string };
const webhook = (alerts: TestAlert[], token?: string) =>
  post(
    metabasePayload(
      ["publisher_id", "type", "title", "description", "procedure_url"],
      alerts.map((a) => [a.publisherId, a.type, a.title ?? null, a.description ?? null, a.procedureUrl ?? null])
    ),
    token
  );

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
    expect(first.body.data).toMatchObject({ created: 1, updated: 0, unknownPublishers: [], unassigned: [] });

    const [warning] = await warningService.findWarnings({ publisherId });
    expect(warning).toMatchObject({ status: "TODO", fixed: false, occurrences: 1, procedureUrl: "https://notion.so/proc" });
    expect(warning.assignees.map((a) => a.id)).toEqual([deploymentUser.user.id]);
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate.mock.calls[0][0]).toBe(TEMPLATE_IDS.WARNING_ALERT);
    expect(sendTemplate.mock.calls[0][1].subject).toBe("[Alerte] " + warning.publisherName + " : Plus de candidatures");

    const second = await webhook([{ type: TYPE, publisherId }]);
    expect(second.body.data).toMatchObject({ created: 0, updated: 1, unknownPublishers: [], unassigned: [] });
    expect((await warningService.findWarnings({ publisherId }))[0]?.occurrences).toBe(2);
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  it("reports alerts created without a deployment user and notifies nobody", async () => {
    const orphan = await createTestPublisher({ isAnnonceur: true });
    const res = await webhook([{ type: TYPE, publisherId: orphan.id }]);

    expect(res.body.data).toMatchObject({ created: 1, unassigned: [{ publisherId: orphan.id, publisherName: orphan.name }] });
    expect(sendTemplate).not.toHaveBeenCalled();
    expect((await warningService.findWarnings({ publisherId: orphan.id }))[0].assignees).toEqual([]);

    // Rejeu : toujours sans chargé de déploiement, donc toujours signalée
    expect((await webhook([{ type: TYPE, publisherId: orphan.id }])).body.data).toMatchObject({ created: 0, updated: 1, unassigned: [{ publisherId: orphan.id }] });

    // Un chargé de déploiement est ensuite désigné : le prochain webhook l'assigne et le notifie
    await prisma.publisher.update({ where: { id: orphan.id }, data: { deploymentUserId: deploymentUser.user.id } });
    const res2 = await webhook([{ type: TYPE, publisherId: orphan.id }]);
    expect(res2.body.data).toMatchObject({ updated: 1, notified: 1, unassigned: [] });
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  it("retries the notification on the next webhook when the email failed", async () => {
    sendTemplate.mockResolvedValueOnce({ ok: false });
    const first = await webhook([{ type: TYPE, publisherId }]);
    expect(first.body.data).toMatchObject({ created: 1, notified: 0, notificationFailed: 1 });
    expect((await warningService.findWarnings({ publisherId }))[0].notifiedAt).toBeNull();

    const second = await webhook([{ type: TYPE, publisherId }]);
    expect(second.body.data).toMatchObject({ created: 0, updated: 1, notified: 1, notificationFailed: 0 });
    expect((await warningService.findWarnings({ publisherId }))[0].notifiedAt).not.toBeNull();
    expect(sendTemplate).toHaveBeenCalledTimes(2);
  });

  it("creates a single alert and mail for concurrent webhooks", async () => {
    await Promise.all(Array.from({ length: 5 }, () => webhook([{ type: TYPE, publisherId }])));
    const warnings = await warningService.findWarnings({ publisherId });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].occurrences).toBe(5);
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown alert type and a non-https procedure_url", async () => {
    expect((await webhook([{ type: "MADE_UP", publisherId }])).status).toBe(400);
    expect((await webhook([{ type: TYPE, publisherId, procedureUrl: "javascript:alert(1)" }])).status).toBe(400);
  });

  it("reports unknown publishers", async () => {
    const res = await webhook([{ type: TYPE, publisherId: "does-not-exist" }]);
    expect(res.body.data).toMatchObject({ created: 0, updated: 0, unknownPublishers: ["does-not-exist"], unassigned: [] });
  });

  describe("Metabase payload", () => {
    it("creates one alert per row with the optional columns, and ignores rows without publisher_id", async () => {
      const res = await post(
        metabasePayload(
          ["PUBLISHER_ID", "title", "Description", "procedure_url", "annonceur"],
          [
            [publisherId, "Plus de candidature", "0 candidature sur 14 jours", "https://notion.so/proc", "Adie"],
            [null, "ligne sans annonceur", null, null, "Inconnu"],
          ]
        )
      );
      expect(res.body.data).toMatchObject({ created: 1, updated: 0, unknownPublishers: [], unassigned: [], received: 2 });

      const [warning] = await warningService.findWarnings({ publisherId });
      expect(warning).toMatchObject({ type: "TRACKING_WARNING", title: "Plus de candidature", description: "0 candidature sur 14 jours", procedureUrl: "https://notion.so/proc" });
      expect(sendTemplate).toHaveBeenCalledTimes(1);
    });

    it("accepts columns described as objects and an explicit type, and deduplicates on replay", async () => {
      const payload = metabasePayload([{ name: "publisher_id" }, { name: "type" }], [[publisherId, "ERROR_WARNING"]]);
      expect((await post(payload)).body.data).toMatchObject({ created: 1, updated: 0 });
      expect((await post(payload)).body.data).toMatchObject({ created: 0, updated: 1 });
      expect(sendTemplate).toHaveBeenCalledTimes(1);
    });

    it("returns 404 for an unknown alert source", async () => {
      const res = await request(app).post("/warning/webhook/unknown").set("Authorization", "Bearer test-alerts-token").send({});
      expect(res.status).toBe(404);
    });

    it("rejects a payload that is not an alert, or whose procedure_url is invalid", async () => {
      expect((await post({ type: "something-else" })).status).toBe(400);
      expect((await post(metabasePayload(["publisher_id", "procedure_url"], [[publisherId, "pas une url"]]))).status).toBe(400);
    });
  });

  describe("repeated and recurring alerts", () => {
    it("deduplicates repeated alerts into a single open alert and notifies once", async () => {
      for (let i = 0; i < 10; i++) {
        await webhook([{ type: TYPE, publisherId }]);
      }
      const warnings = await warningService.findWarnings({ publisherId });
      expect(warnings).toHaveLength(1);
      expect(warnings[0].occurrences).toBe(10);
      expect(sendTemplate).toHaveBeenCalledTimes(1);
    });

    it("propagates a new or changed procedure URL to the open alert, and keeps it when the replay has none", async () => {
      const procedureUrl = (url?: string) => webhook([{ type: TYPE, publisherId, procedureUrl: url }]);
      const current = async () => (await warningService.findWarnings({ publisherId }))[0].procedureUrl;

      await procedureUrl();
      expect(await current()).toBeNull();

      await procedureUrl("https://notion.so/v1");
      expect(await current()).toBe("https://notion.so/v1");

      await procedureUrl("https://notion.so/v2");
      expect(await current()).toBe("https://notion.so/v2");

      await procedureUrl();
      expect(await current()).toBe("https://notion.so/v2");
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
        { type: "ERROR_WARNING", publisherId },
      ]);
      const res = await request(app).post("/warning/search").set("Authorization", `jwt ${deploymentUser.token}`).send({ publisherId, fixed: false });
      expect(res.body.data.map((w: { type: string }) => w.type).sort()).toEqual(["ERROR_WARNING", TYPE]);
      // Pas de notion d'incident : un mail par alerte (pas de regroupement)
      expect(sendTemplate).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Dashboard warning controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("allows GET /warning/state for an authenticated user", async () => {
    const res = await request(app).get("/warning/state").set(authHeader());

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows POST /warning/search for an accessible publisher", async () => {
    const res = await request(app).post("/warning/search").set(authHeader()).send({ publisherId });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("Admin alerts screen endpoints", () => {
  let adminAuth: { Authorization: string };
  let publisherId: string;

  beforeEach(async () => {
    const { token } = await createTestUser({ role: "admin" });
    adminAuth = { Authorization: `jwt ${token}` };
    publisherId = (await createTestPublisher({ isAnnonceur: true })).id;
  });

  it("paginates POST /warning/search with a total, and keeps the full list without page", async () => {
    for (const type of ["TRACKING_WARNING", "ERROR_WARNING", "EMPTY_WARNING"]) {
      await warningService.createWarning({ type, publisherId });
    }

    const paged = await request(app).post("/warning/search").set(adminAuth).send({ status: "TODO", page: 2, size: 2 });
    expect(paged.status).toBe(200);
    expect(paged.body.total).toBe(3);
    expect(paged.body.data).toHaveLength(1);

    const legacy = await request(app).post("/warning/search").set(adminAuth).send({ fixed: false });
    expect(legacy.body.data).toHaveLength(3);
    expect(legacy.body.total).toBeUndefined();
  });

  it("filters by status", async () => {
    await warningService.createWarning({ type: "TRACKING_WARNING", publisherId });
    await warningService.createWarning({ type: "ERROR_WARNING", publisherId, status: "RESOLVED" });

    const res = await request(app).post("/warning/search").set(adminAuth).send({ status: "RESOLVED", page: 1 });
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].type).toBe("ERROR_WARNING");
  });

  it("gets an alert by id, 404 when unknown", async () => {
    const alert = await warningService.createWarning({ type: TYPE, publisherId });
    const ok = await request(app).get(`/warning/${alert.id}`).set(adminAuth);
    expect(ok.status).toBe(200);
    expect(ok.body.data.id).toBe(alert.id);

    expect((await request(app).get("/warning/unknown-id").set(adminAuth)).status).toBe(404);
  });

  it("changes the status and keeps the legacy fixed flag in sync", async () => {
    const alert = await warningService.createWarning({ type: TYPE, publisherId });

    const resolved = await request(app).put(`/warning/${alert.id}/status`).set(adminAuth).send({ status: "RESOLVED" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data).toMatchObject({ status: "RESOLVED", fixed: true });

    const reopened = await request(app).put(`/warning/${alert.id}/status`).set(adminAuth).send({ status: "IN_PROGRESS" });
    expect(reopened.body.data).toMatchObject({ status: "IN_PROGRESS", fixed: false, fixedAt: null });
  });

  it("returns 409 when reopening an alert while another one is open for the same publisher and type", async () => {
    const resolved = await warningService.createWarning({ type: TYPE, publisherId, status: "RESOLVED" });
    await warningService.createWarning({ type: TYPE, publisherId });

    const res = await request(app).put(`/warning/${resolved.id}/status`).set(adminAuth).send({ status: "TODO" });
    expect(res.status).toBe(409);
  });

  it("rejects non-admin users and unknown alerts", async () => {
    const alert = await warningService.createWarning({ type: TYPE, publisherId });
    const { token } = await createTestUser({ role: "user", publishers: [publisherId] });
    const userAuth = { Authorization: `jwt ${token}` };

    expect((await request(app).put(`/warning/${alert.id}/status`).set(userAuth).send({ status: "RESOLVED" })).status).toBe(401);
    expect((await request(app).get(`/warning/${alert.id}`).set(userAuth)).status).toBe(401);
    expect((await request(app).put("/warning/unknown-id/status").set(adminAuth).send({ status: "RESOLVED" })).status).toBe(404);
  });
});

describe("Alert comments", () => {
  let adminAuth: { Authorization: string };
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let publisherId: string;

  beforeEach(async () => {
    admin = await createTestUser({ role: "admin" });
    adminAuth = { Authorization: `jwt ${admin.token}` };
    publisherId = (await createTestPublisher({ isAnnonceur: true })).id;
  });

  it("exposes fixedAt once the alert is resolved", async () => {
    const alert = await warningService.createWarning({ type: TYPE, publisherId });
    const resolved = await request(app).put(`/warning/${alert.id}/status`).set(adminAuth).send({ status: "RESOLVED" });
    expect(resolved.body.data.fixedAt).toBeTruthy();
  });

  it("lists, adds and edits comments (author only)", async () => {
    const alert = await warningService.createWarning({ type: TYPE, publisherId });
    const created = await request(app).post(`/warning/${alert.id}/comments`).set(adminAuth).send({ body: "  Partenaire relancé  " });
    expect(created.body.data).toMatchObject({ body: "Partenaire relancé", author: { id: admin.user.id } });

    const edited = await request(app).put(`/warning/${alert.id}/comments/${created.body.data.id}`).set(adminAuth).send({ body: "Corrigé" });
    expect(edited.body.data.body).toBe("Corrigé");

    const other = await createTestUser({ role: "admin" });
    const forbidden = await request(app)
      .put(`/warning/${alert.id}/comments/${created.body.data.id}`)
      .set({ Authorization: `jwt ${other.token}` })
      .send({ body: "x" });
    expect(forbidden.status).toBe(403);

    expect((await request(app).post(`/warning/${alert.id}/comments`).set(adminAuth).send({ body: "  " })).status).toBe(400);
    const list = await request(app).get(`/warning/${alert.id}/comments`).set(adminAuth);
    expect(list.body.data.map((c: { body: string }) => c.body)).toEqual(["Corrigé"]);
  });

  it("hides the identity of a deleted author", async () => {
    const alert = await warningService.createWarning({ type: TYPE, publisherId });
    await request(app).post(`/warning/${alert.id}/comments`).set(adminAuth).send({ body: "Fait" });
    await userService.updateUser(admin.user.id, { deletedAt: new Date() });

    const { token } = await createTestUser({ role: "admin" });
    const list = await request(app)
      .get(`/warning/${alert.id}/comments`)
      .set({ Authorization: `jwt ${token}` });
    expect(list.body.data).toMatchObject([{ body: "Fait", author: null }]);
  });
});
