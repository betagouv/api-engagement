import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, findUniqueMock, updateMock, updateManyMock, deleteManyMock, findUserByIdMock, sendTemplateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  updateManyMock: vi.fn(),
  deleteManyMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  sendTemplateMock: vi.fn(),
}));

vi.mock("@/repositories/mfa-challenge", () => ({
  mfaChallengeRepository: {
    create: createMock,
    findUnique: findUniqueMock,
    update: updateMock,
    updateMany: updateManyMock,
    deleteMany: deleteManyMock,
  },
}));

vi.mock("@/services/brevo", () => ({
  sendTemplate: sendTemplateMock,
  TEMPLATE_IDS: { MFA_CODE: 42 },
}));

vi.mock("@/services/user", () => ({
  userService: { findUserById: findUserByIdMock },
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
  deletedAt: null,
  brevoContactId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const challengeId = "challenge-1";
const signToken = (id = challengeId) => jwt.sign({ challengeId: id, purpose: "mfa" }, MFA_TOKEN_SECRET, { expiresIn: 600 });

describe("mfaService", () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: challengeId });
    findUniqueMock.mockReset();
    updateMock.mockReset();
    updateManyMock.mockReset().mockResolvedValue({ count: 1 });
    deleteManyMock.mockReset().mockResolvedValue({ count: 0 });
    findUserByIdMock.mockReset().mockResolvedValue(user);
    sendTemplateMock.mockReset().mockResolvedValue({ ok: true });
  });

  describe("createChallenge", () => {
    it("stores a hashed 6-digit code and returns a signed token", async () => {
      const result = await mfaService.createChallenge(user);

      expect(result.ok).toBe(true);
      const sentCode = sendTemplateMock.mock.calls[0][1].params.code as string;
      expect(sentCode).toMatch(/^\d{6}$/);
      const { data } = createMock.mock.calls[0][0];
      await expect(bcrypt.compare(sentCode, data.codeHash)).resolves.toBe(true);
      expect(deleteManyMock).toHaveBeenCalledWith({ where: { userId: user.id, consumedAt: null } });
      if (result.ok) {
        const payload = jwt.verify(result.token, MFA_TOKEN_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
        expect(payload.challengeId).toBe(challengeId);
      }
    });

    it("deletes the challenge and fails when the email cannot be sent", async () => {
      sendTemplateMock.mockResolvedValue({ ok: false });

      const result = await mfaService.createChallenge(user);

      expect(result.ok).toBe(false);
      expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: challengeId } });
    });
  });

  describe("verifyAndConsumeChallenge", () => {
    const validChallenge = async (code: string, overrides = {}) => ({
      id: challengeId,
      userId: user.id,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      resendAfter: null,
      consumedAt: null,
      ...overrides,
    });

    it("consumes a valid challenge atomically and returns the user", async () => {
      findUniqueMock.mockResolvedValue(await validChallenge("123456"));

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "123456");

      expect(result).toEqual({ ok: true, user });
      expect(updateManyMock).toHaveBeenCalledWith({ where: { id: challengeId, consumedAt: null }, data: { consumedAt: expect.any(Date) } });
    });

    it("fails when the atomic consume loses the race (count 0)", async () => {
      findUniqueMock.mockResolvedValue(await validChallenge("123456"));
      updateManyMock.mockResolvedValue({ count: 0 });

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "123456");

      expect(result).toEqual({ ok: false, reason: "invalid-token" });
    });

    it("increments attempts on a wrong code", async () => {
      findUniqueMock.mockResolvedValue(await validChallenge("123456"));
      updateMock.mockResolvedValue({ attemptCount: 1 });

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "000000");

      expect(result).toEqual({ ok: false, reason: "invalid-code" });
      expect(updateMock).toHaveBeenCalledWith({ where: { id: challengeId }, data: { attemptCount: { increment: 1 } } });
    });

    it("locks the challenge after too many attempts", async () => {
      findUniqueMock.mockResolvedValue(await validChallenge("123456", { attemptCount: 4 }));
      updateMock.mockResolvedValue({ attemptCount: 5 });

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "000000");

      expect(result).toEqual({ ok: false, reason: "too-many-attempts" });
      expect(updateManyMock).toHaveBeenCalledWith({ where: { id: challengeId, consumedAt: null }, data: { consumedAt: expect.any(Date) } });
    });

    it("rejects an expired challenge", async () => {
      findUniqueMock.mockResolvedValue(await validChallenge("123456", { expiresAt: new Date(Date.now() - 1000) }));

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "123456");

      expect(result).toEqual({ ok: false, reason: "invalid-token" });
    });

    it("rejects an unknown token", async () => {
      const result = await mfaService.verifyAndConsumeChallenge("garbage", "123456");
      expect(result).toEqual({ ok: false, reason: "invalid-token" });
    });
  });

  describe("resendChallenge", () => {
    it("refuses to resend during the cooldown", async () => {
      findUniqueMock.mockResolvedValue({
        id: challengeId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        resendAfter: new Date(Date.now() + 30_000),
        consumedAt: null,
      });

      const result = await mfaService.resendChallenge(signToken());

      expect(result).toEqual({ ok: false, reason: "cooldown" });
      expect(sendTemplateMock).not.toHaveBeenCalled();
    });

    it("regenerates the code and resets attempts", async () => {
      findUniqueMock.mockResolvedValue({
        id: challengeId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        resendAfter: new Date(Date.now() - 1000),
        consumedAt: null,
      });
      updateMock.mockResolvedValue({});

      const result = await mfaService.resendChallenge(signToken());

      expect(result).toEqual({ ok: true });
      const { data } = updateMock.mock.calls[0][0];
      expect(data.attemptCount).toBe(0);
      expect(sendTemplateMock).toHaveBeenCalled();
    });
  });
});
