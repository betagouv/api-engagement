import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Force l'activation de la MFA (désactivée par défaut en env de test via ENV=development).
// Le reste de @/config (SECRET, ENV, PUBLISHER_IDS...) est conservé tel quel.
vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return { ...actual, MFA_ENABLED: true };
});

// Capture le code OTP envoyé par email (sendTemplate est le seul canal de sortie du code).
const { sendTemplateMock } = vi.hoisted(() => ({ sendTemplateMock: vi.fn() }));
vi.mock("@/services/brevo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/brevo")>();
  return { ...actual, sendTemplate: sendTemplateMock };
});

import { SECRET } from "@/config";

import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const PASSWORD = "SuperSecret123!";
const app = createTestApp();

const lastSentCode = (): string => sendTemplateMock.mock.calls.at(-1)?.[1]?.params?.code;

describe("MFA login flow", () => {
  beforeEach(() => {
    sendTemplateMock.mockReset().mockResolvedValue({ ok: true });
  });

  it("challenges with an OTP instead of issuing a token when password is correct", async () => {
    const { user } = await createTestUser({ password: PASSWORD });

    const res = await request(app).post("/user/login").send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.mfaRequired).toBe(true);
    expect(res.body.data.mfaToken).toBeTruthy();
    expect(res.body.data.token).toBeUndefined();
    expect(lastSentCode()).toMatch(/^\d{6}$/);
  });

  it("issues the access token when the OTP is correct, and sets the trusted-device cookie", async () => {
    const { user } = await createTestUser({ password: PASSWORD });

    const login = await request(app).post("/user/login").send({ email: user.email, password: PASSWORD });
    const code = lastSentCode();

    const res = await request(app).post("/user/login/mfa").set("Authorization", `jwt ${login.body.data.mfaToken}`).send({ code, rememberDevice: true });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.headers["set-cookie"].join(";")).toContain("mfa_device");
  });

  it("rejects an incorrect OTP", async () => {
    const { user } = await createTestUser({ password: PASSWORD });
    const login = await request(app).post("/user/login").send({ email: user.email, password: PASSWORD });

    const res = await request(app).post("/user/login/mfa").set("Authorization", `jwt ${login.body.data.mfaToken}`).send({ code: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.data?.token).toBeUndefined();
  });

  it("skips the OTP when a valid trusted-device cookie is presented", async () => {
    const { user } = await createTestUser({ password: PASSWORD });
    const deviceToken = jwt.sign({ _id: user.id, purpose: "mfa-device" }, SECRET);

    const res = await request(app)
      .post("/user/login")
      .set("Cookie", [`mfa_device=${deviceToken}`])
      .send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.mfaRequired).toBeUndefined();
    expect(sendTemplateMock).not.toHaveBeenCalled();
  });
});
