import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUserByIdMock, sendTemplateMock, updateUserMock } = vi.hoisted(() => ({
  findUserByIdMock: vi.fn(),
  sendTemplateMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("@/services/brevo", () => ({
  sendTemplate: sendTemplateMock,
  TEMPLATE_IDS: { MFA_CODE: 42 },
}));

vi.mock("@/services/user", () => ({
  userService: {
    findUserById: findUserByIdMock,
    updateUser: updateUserMock,
  },
}));

import { MFA_TOKEN_SECRET } from "@/config";
import { mfaService } from "@/services/mfa";
import type { UserRecord } from "@/types/user";

const user: UserRecord = {
  id: "user-1",
  firstname: "Alice",
  lastname: "Martin",
  publishers: [],
  email: "alice@example.org",
  password: null,
  role: "user",
  invitationToken: null,
  invitationExpiresAt: null,
  invitationCompletedAt: null,
  lastActivityAt: null,
  forgotPasswordToken: null,
  forgotPasswordExpiresAt: null,
  mfaCode: null,
  mfaCodeExpiresAt: null,
  deletedAt: null,
  brevoContactId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("mfaService", () => {
  beforeEach(() => {
    findUserByIdMock.mockReset();
    sendTemplateMock.mockReset().mockResolvedValue({ ok: true });
    updateUserMock.mockReset().mockResolvedValue(user);
  });

  it("creates a challenge with one shared ten-minute lifetime", async () => {
    const before = Date.now();
    const token = await mfaService.createChallenge(user);
    const after = Date.now();

    const [, patch] = updateUserMock.mock.calls[0];
    const sentCode = sendTemplateMock.mock.calls[0][1].params.code as string;
    const payload = jwt.verify(token, MFA_TOKEN_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;

    expect(sentCode).toMatch(/^\d{6}$/);
    await expect(bcrypt.compare(sentCode, patch.mfaCode)).resolves.toBe(true);
    expect(patch.mfaCodeExpiresAt.getTime()).toBeGreaterThanOrEqual(before + 10 * 60 * 1000);
    expect(patch.mfaCodeExpiresAt.getTime()).toBeLessThanOrEqual(after + 10 * 60 * 1000);
    expect(payload.exp! - payload.iat!).toBe(10 * 60);
  });

  it("verifies and consumes a valid challenge", async () => {
    const code = "123456";
    const challengedUser = {
      ...user,
      mfaCode: await bcrypt.hash(code, 10),
      mfaCodeExpiresAt: new Date(Date.now() + 60_000),
    };
    findUserByIdMock.mockResolvedValue(challengedUser);
    const token = jwt.sign({ _id: user.id, purpose: "mfa" }, MFA_TOKEN_SECRET, { expiresIn: 60 });

    await expect(mfaService.verifyAndConsumeChallenge(token, code)).resolves.toEqual({ ok: true, user: challengedUser });
    expect(updateUserMock).toHaveBeenCalledWith(user.id, { mfaCode: null, mfaCodeExpiresAt: null });
  });
});
