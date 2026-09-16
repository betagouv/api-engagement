import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, findUniqueMock, updateMock, updateManyMock, deleteManyMock, countMock, sumAttemptsMock, findUserByIdMock, sendTemplateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  updateManyMock: vi.fn(),
  deleteManyMock: vi.fn(),
  countMock: vi.fn(),
  sumAttemptsMock: vi.fn(),
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
    count: countMock,
    sumAttempts: sumAttemptsMock,
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

const buildChallenge = async (code: string, overrides: Record<string, unknown> = {}) => ({
  id: challengeId,
  userId: user.id,
  codeHash: await bcrypt.hash(code, 10),
  expiresAt: new Date(Date.now() + 60_000),
  attemptCount: 0,
  resendAfter: new Date(Date.now() - 1000),
  consumedAt: null,
  ...overrides,
});

describe("mfaService", () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: challengeId });
    findUniqueMock.mockReset();
    updateMock.mockReset().mockResolvedValue({ attemptCount: 1 });
    updateManyMock.mockReset().mockResolvedValue({ count: 1 });
    deleteManyMock.mockReset().mockResolvedValue({ count: 0 });
    countMock.mockReset().mockResolvedValue(0);
    sumAttemptsMock.mockReset().mockResolvedValue(0);
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
    });

    it("throttles when too many challenges were created in the window", async () => {
      countMock.mockResolvedValue(5);

      const result = await mfaService.createChallenge(user);

      expect(result).toEqual({ ok: false, reason: "throttled" });
      expect(createMock).not.toHaveBeenCalled();
    });

    it("throttles when the account attempt cap is reached", async () => {
      sumAttemptsMock.mockResolvedValue(10);

      const result = await mfaService.createChallenge(user);

      expect(result).toEqual({ ok: false, reason: "throttled" });
    });

    it("deletes the challenge and fails when the email cannot be sent", async () => {
      sendTemplateMock.mockResolvedValue({ ok: false });

      const result = await mfaService.createChallenge(user);

      expect(result).toEqual({ ok: false, reason: "send-failed" });
      expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: challengeId } });
    });
  });

  describe("verifyAndConsumeChallenge", () => {
    it("consumes a valid challenge with the verified codeHash in the atomic condition", async () => {
      const challenge = await buildChallenge("123456");
      findUniqueMock.mockResolvedValue(challenge);

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "123456");

      expect(result).toEqual({ ok: true, user });
      expect(updateManyMock).toHaveBeenCalledWith({ where: { id: challengeId, consumedAt: null, codeHash: challenge.codeHash }, data: { consumedAt: expect.any(Date) } });
    });

    it("rejects an old code that lost the race with a resend (count 0)", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456"));
      updateManyMock.mockResolvedValue({ count: 0 });

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "123456");

      expect(result).toEqual({ ok: false, reason: "invalid-token" });
    });

    it("increments attempts on a wrong code", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456"));
      updateMock.mockResolvedValue({ attemptCount: 1 });

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "000000");

      expect(result).toEqual({ ok: false, reason: "invalid-code" });
      expect(updateMock).toHaveBeenCalledWith({ where: { id: challengeId }, data: { attemptCount: { increment: 1 } } });
    });

    it("locks the challenge after too many per-challenge attempts", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456", { attemptCount: 4 }));
      updateMock.mockResolvedValue({ attemptCount: 5 });

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "000000");

      expect(result).toEqual({ ok: false, reason: "too-many-attempts" });
    });

    it("locks when the account attempt cap is reached, even on a fresh challenge", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456"));
      sumAttemptsMock.mockResolvedValue(10);

      const result = await mfaService.verifyAndConsumeChallenge(signToken(), "123456");

      expect(result).toEqual({ ok: false, reason: "too-many-attempts" });
    });

    it("rejects an unknown token", async () => {
      const result = await mfaService.verifyAndConsumeChallenge("garbage", "123456");
      expect(result).toEqual({ ok: false, reason: "invalid-token" });
    });
  });

  describe("resendChallenge", () => {
    it("refuses to resend when the cooldown slot cannot be claimed", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456", { resendAfter: new Date(Date.now() + 30_000) }));
      updateManyMock.mockResolvedValue({ count: 0 });

      const result = await mfaService.resendChallenge(signToken());

      expect(result).toEqual({ ok: false, reason: "cooldown" });
      expect(sendTemplateMock).not.toHaveBeenCalled();
    });

    it("keeps the previous code when the resend email fails", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456"));
      sendTemplateMock.mockResolvedValue({ ok: false });

      const result = await mfaService.resendChallenge(signToken());

      expect(result).toEqual({ ok: false, reason: "send-failed" });
      expect(updateMock).not.toHaveBeenCalled(); // codeHash inchangé => ancien code encore valable
    });

    it("rotates the code without extending the expiry", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456"));

      const result = await mfaService.resendChallenge(signToken());

      expect(result).toEqual({ ok: true });
      const { data } = updateMock.mock.calls[0][0];
      expect(Object.keys(data)).toEqual(["codeHash"]); // ni expiresAt ni attemptCount
    });

    it("refuses to resend once the account attempt cap is reached", async () => {
      findUniqueMock.mockResolvedValue(await buildChallenge("123456"));
      sumAttemptsMock.mockResolvedValue(10);

      const result = await mfaService.resendChallenge(signToken());

      expect(result).toEqual({ ok: false, reason: "too-many-attempts" });
    });
  });
});
