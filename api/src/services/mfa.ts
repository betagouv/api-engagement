import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { MFA_DEVICE_SECRET, MFA_TOKEN_SECRET } from "@/config";
import { sendTemplate, TEMPLATE_IDS } from "@/services/brevo";
import { userService } from "@/services/user";
import type { UserRecord } from "@/types/user";

const SALT_ROUNDS = 10;
const MFA_CHALLENGE_DURATION_SECONDS = 10 * 60;
const MFA_CHALLENGE_DURATION_MS = MFA_CHALLENGE_DURATION_SECONDS * 1000;
const MFA_DEVICE_DURATION_SECONDS = 30 * 24 * 60 * 60;

export const MFA_DEVICE_COOKIE_NAME = "mfa_device";
export const MFA_DEVICE_COOKIE_MAX_AGE_MS = MFA_DEVICE_DURATION_SECONDS * 1000;

type MfaTokenPayload = {
  _id?: string;
  purpose?: string;
};

export type MfaVerificationResult = { ok: true; user: UserRecord } | { ok: false; reason: "invalid-token" | "invalid-code" };

const generateCode = (): string => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

const storeCode = async (userId: string, code: string): Promise<void> => {
  await userService.updateUser(userId, {
    mfaCode: await bcrypt.hash(code, SALT_ROUNDS),
    mfaCodeExpiresAt: new Date(Date.now() + MFA_CHALLENGE_DURATION_MS),
  });
};

const sendCode = async (user: UserRecord): Promise<void> => {
  const code = generateCode();
  await storeCode(user.id, code);
  await sendTemplate(TEMPLATE_IDS.MFA_CODE, { emailTo: [user.email], params: { code } });
};

const decodeChallengeToken = (token: string): string | null => {
  try {
    const payload = jwt.verify(token, MFA_TOKEN_SECRET, { algorithms: ["HS256"] }) as MfaTokenPayload;
    return payload.purpose === "mfa" && payload._id ? payload._id : null;
  } catch {
    return null;
  }
};

const isCodeValid = async (user: UserRecord, candidate: string): Promise<boolean> => {
  if (!user.mfaCode || !user.mfaCodeExpiresAt || user.mfaCodeExpiresAt < new Date()) {
    return false;
  }
  return bcrypt.compare(candidate, user.mfaCode);
};

const clearCode = async (userId: string): Promise<void> => {
  await userService.updateUser(userId, { mfaCode: null, mfaCodeExpiresAt: null });
};

export const mfaService = {
  isTrustedDevice(token: string | undefined, userId: string): boolean {
    if (!token) {
      return false;
    }
    try {
      const payload = jwt.verify(token, MFA_DEVICE_SECRET, { algorithms: ["HS256"] }) as MfaTokenPayload;
      return payload.purpose === "mfa-device" && payload._id === userId;
    } catch {
      return false;
    }
  },

  async createChallenge(user: UserRecord): Promise<string> {
    await sendCode(user);
    return jwt.sign({ _id: user.id, purpose: "mfa" }, MFA_TOKEN_SECRET, { expiresIn: MFA_CHALLENGE_DURATION_SECONDS });
  },

  async verifyAndConsumeChallenge(token: string, candidate: string): Promise<MfaVerificationResult> {
    const userId = decodeChallengeToken(token);
    if (!userId) {
      return { ok: false, reason: "invalid-token" };
    }

    const user = await userService.findUserById(userId);
    if (!user || !(await isCodeValid(user, candidate))) {
      return { ok: false, reason: "invalid-code" };
    }

    await clearCode(user.id);
    return { ok: true, user };
  },

  async resendChallenge(token: string): Promise<boolean> {
    const userId = decodeChallengeToken(token);
    if (!userId) {
      return false;
    }

    const user = await userService.findUserById(userId);
    if (!user) {
      return false;
    }

    await sendCode(user);
    return true;
  },

  createTrustedDeviceToken(userId: string): string {
    return jwt.sign({ _id: userId, purpose: "mfa-device" }, MFA_DEVICE_SECRET, { expiresIn: MFA_DEVICE_DURATION_SECONDS });
  },
};
