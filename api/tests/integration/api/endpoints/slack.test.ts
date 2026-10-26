import { createHmac } from "crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const slack = vi.hoisted(() => {
  process.env.SLACK_SIGNING_SECRET = "test-signing-secret";
  return {
    postMessage: vi.fn().mockResolvedValue({ ok: true, ts: "1700000000.000100", channel: "C123" }),
    updateMessage: vi.fn().mockResolvedValue({ ok: true }),
    respondEphemeral: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("@/services/slack", () => slack);

import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

const sign = (body: string, timestamp = Math.floor(Date.now() / 1000)) => ({
  "x-slack-request-timestamp": String(timestamp),
  "x-slack-signature": `v0=${createHmac("sha256", "test-signing-secret").update(`v0:${timestamp}:${body}`).digest("hex")}`,
});

const click = (slackUserId: string, warningId: string, status: "IN_PROGRESS" | "RESOLVED", headers?: Record<string, string>) => {
  const body = new URLSearchParams({
    payload: JSON.stringify({
      type: "block_actions",
      user: { id: slackUserId },
      response_url: "https://hooks.slack.test/response",
      actions: [{ action_id: `alert_status:${status}`, value: warningId }],
    }),
  }).toString();
  return request(app)
    .post("/slack/interactions")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set(headers ?? sign(body))
    .send(body);
};

describe("POST /slack/interactions", () => {
  let warningId: string;
  let assigneeSlackId: string;

  beforeEach(async () => {
    Object.values(slack).forEach((fn) => fn.mockClear());
    assigneeSlackId = "U0ASSIGNEE";
    const { user } = await createTestUser({ role: "admin" });
    await userService.updateUser(user.id, { slackUserId: assigneeSlackId });
    const publisher = await createTestPublisher({ isAnnonceur: true, deploymentUserId: user.id });
    const warning = await warningService.createWarning({ type: "TRACKING_WARNING", publisherId: publisher.id, assigneeIds: [user.id] });
    await warningService.updateWarning(warning.id, { slackMessage: { channelId: "C123", ts: "1700000000.000100" } });
    warningId = warning.id;
  });

  it("rejects a request with an invalid signature", async () => {
    const res = await click(assigneeSlackId, warningId, "RESOLVED", { "x-slack-request-timestamp": String(Math.floor(Date.now() / 1000)), "x-slack-signature": "v0=bad" });

    expect(res.status).toBe(401);
    expect((await warningService.findWarningById(warningId))?.status).toBe("TODO");
  });

  it("rejects a stale timestamp", async () => {
    const body = "payload=%7B%7D";
    const res = await request(app)
      .post("/slack/interactions")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set(sign(body, Math.floor(Date.now() / 1000) - 3600))
      .send(body);

    expect(res.status).toBe(401);
  });

  it("acknowledges immediately, even when Slack is slow", async () => {
    slack.updateMessage.mockReturnValueOnce(new Promise(() => {}));

    const res = await click(assigneeSlackId, warningId, "IN_PROGRESS");

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(slack.updateMessage).toHaveBeenCalledTimes(1));
    expect((await warningService.findWarningById(warningId))?.status).toBe("IN_PROGRESS");
  });

  it("changes the status for an assignee and updates the Slack message", async () => {
    expect((await click(assigneeSlackId, warningId, "IN_PROGRESS")).status).toBe(200);

    await vi.waitFor(() => expect(slack.updateMessage).toHaveBeenCalledTimes(1));
    expect((await warningService.findWarningById(warningId))?.status).toBe("IN_PROGRESS");
    const [message, channel, ts] = slack.updateMessage.mock.calls[0];
    expect([channel, ts]).toEqual(["C123", "1700000000.000100"]);
    expect(JSON.stringify(message.blocks)).toContain("En cours");

    await click(assigneeSlackId, warningId, "RESOLVED");
    await vi.waitFor(() => expect(slack.updateMessage).toHaveBeenCalledTimes(2));
    expect((await warningService.findWarningById(warningId))?.status).toBe("RESOLVED");
    expect(JSON.stringify(slack.updateMessage.mock.calls[1][0].blocks)).not.toContain('"type":"actions"');
  });

  it("never reopens a resolved alert from a stale button, and resyncs the message", async () => {
    await warningService.updateWarning(warningId, { status: "RESOLVED" });

    await click(assigneeSlackId, warningId, "IN_PROGRESS");

    await vi.waitFor(() => expect(slack.updateMessage).toHaveBeenCalledTimes(1));
    expect(slack.respondEphemeral.mock.calls[0][1]).toContain("déjà changé");
    const warning = await warningService.findWarningById(warningId);
    expect(warning).toMatchObject({ status: "RESOLVED", fixed: true });
    expect(warning?.fixedAt).not.toBeNull();
    expect(JSON.stringify(slack.updateMessage.mock.calls[0][0].blocks)).not.toContain('"type":"actions"');
  });

  it("tells an unlinked Slack account to ask an admin, without changing anything", async () => {
    expect((await click("U0UNKNOWN", warningId, "RESOLVED")).status).toBe(200);

    await vi.waitFor(() => expect(slack.respondEphemeral).toHaveBeenCalledTimes(1));
    expect((await warningService.findWarningById(warningId))?.status).toBe("TODO");
    expect(slack.respondEphemeral.mock.calls[0][1]).toContain("pas lié");
    expect(slack.updateMessage).not.toHaveBeenCalled();
  });

  it("refuses a linked user who is neither assignee nor admin", async () => {
    const { user: other } = await createTestUser({ role: "user" });
    await userService.updateUser(other.id, { slackUserId: "U0OTHER" });

    await click("U0OTHER", warningId, "RESOLVED");

    await vi.waitFor(() => expect(slack.respondEphemeral).toHaveBeenCalledTimes(1));
    expect((await warningService.findWarningById(warningId))?.status).toBe("TODO");
    expect(slack.respondEphemeral.mock.calls[0][1]).toContain("assignés");
  });

  it("tells the user when the processing fails after the acknowledgment", async () => {
    vi.spyOn(warningService, "transitionStatus").mockRejectedValueOnce(new Error("boom"));

    expect((await click(assigneeSlackId, warningId, "RESOLVED")).status).toBe(200);

    await vi.waitFor(() => expect(slack.respondEphemeral).toHaveBeenCalledTimes(1));
    expect(slack.respondEphemeral.mock.calls[0][1]).toContain("erreur");
  });
});

describe("PUT /user/:id slackUserId", () => {
  it("refuses a Slack id already linked to another active account", async () => {
    const { user: admin, token } = await createTestUser({ role: "admin" });
    const { user: other } = await createTestUser({ role: "user" });
    await userService.updateUser(admin.id, { slackUserId: "U0TAKEN" });

    const res = await request(app).put(`/user/${other.id}`).set("Authorization", `jwt ${token}`).send({ slackUserId: "U0TAKEN" });

    expect(res.status).toBe(409);
    expect((await userService.findUserById(other.id))?.slackUserId).toBeNull();
  });

  it("allows reusing the Slack id of a deleted account", async () => {
    const { user: admin, token } = await createTestUser({ role: "admin" });
    const { user: former } = await createTestUser({ role: "user" });
    await userService.updateUser(former.id, { slackUserId: "U0FORMER" });
    await userService.updateUser(former.id, { deletedAt: new Date() });

    const res = await request(app).put(`/user/${admin.id}`).set("Authorization", `jwt ${token}`).send({ slackUserId: "U0FORMER" });

    expect(res.status).toBe(200);
  });
});
