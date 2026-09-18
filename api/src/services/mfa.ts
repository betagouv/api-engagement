import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { MFA_DEVICE_SECRET, MFA_TOKEN_SECRET } from "@/config";
import { mfaChallengeRepository } from "@/repositories/mfa-challenge";
import { sendTemplate, TEMPLATE_IDS } from "@/services/brevo";
import { userService } from "@/services/user";
import type { UserRecord } from "@/types/user";

const SALT_ROUNDS = 10;
const CHALLENGE_DURATION_SECONDS = 10 * 60;
const CHALLENGE_DURATION_MS = CHALLENGE_DURATION_SECONDS * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const DEVICE_DURATION_SECONDS = 30 * 24 * 60 * 60;

// Limite par challenge + limites persistantes par compte sur une fenêtre glissante :
// ces dernières survivent à un nouveau login ou à un renvoi (un attaquant ne peut donc pas
// remettre le compteur à zéro en rappelant /user/login). Cf. OWASP MFA Cheat Sheet.
const MAX_ATTEMPTS_PER_CHALLENGE = 5;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const MAX_CHALLENGES_PER_WINDOW = 5;
const MAX_ATTEMPTS_PER_WINDOW = 10;

export const MFA_DEVICE_COOKIE_NAME = "mfa_device";
export const MFA_DEVICE_COOKIE_MAX_AGE_MS = DEVICE_DURATION_SECONDS * 1000;

type ChallengeTokenPayload = { challengeId?: string; purpose?: string };
type DeviceTokenPayload = { _id?: string; purpose?: string };

export type MfaChallengeCreation = { ok: true; token: string } | { ok: false; reason: "throttled" | "send-failed" };
export type MfaVerificationResult = { ok: true; user: UserRecord } | { ok: false; reason: "invalid-token" | "invalid-code" | "too-many-attempts" };
export type MfaResendResult = { ok: true } | { ok: false; reason: "invalid-token" | "cooldown" | "send-failed" | "too-many-attempts" };

const generateCode = (): string => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

const windowStart = (): Date => new Date(Date.now() - ACCOUNT_WINDOW_MS);

const signChallengeToken = (challengeId: string): string => jwt.sign({ challengeId, purpose: "mfa" }, MFA_TOKEN_SECRET, { expiresIn: CHALLENGE_DURATION_SECONDS });

const decodeChallengeToken = (token: string): string | null => {
  try {
    const payload = jwt.verify(token, MFA_TOKEN_SECRET, { algorithms: ["HS256"] }) as ChallengeTokenPayload;
    return payload.purpose === "mfa" && payload.challengeId ? payload.challengeId : null;
  } catch {
    return null;
  }
};

// Envoie le code par email. sendTemplate ne lève pas : renvoie false si Brevo ou le template échoue.
const deliverCode = async (email: string, code: string): Promise<boolean> => {
  const result = await sendTemplate(TEMPLATE_IDS.MFA_CODE, { emailTo: [email], params: { code } });
  return result.ok;
};

// Somme des tentatives échouées du compte sur la fenêtre : cap anti-brute-force persistant.
const accountAttemptsExceeded = async (userId: string): Promise<boolean> => {
  const total = await mfaChallengeRepository.sumAttempts({ userId, createdAt: { gte: windowStart() } });
  return total >= MAX_ATTEMPTS_PER_WINDOW;
};

export const mfaService = {
  isTrustedDevice(token: string | undefined, userId: string): boolean {
    if (!token) {
      return false;
    }
    try {
      const payload = jwt.verify(token, MFA_DEVICE_SECRET, { algorithms: ["HS256"] }) as DeviceTokenPayload;
      return payload.purpose === "mfa-device" && payload._id === userId;
    } catch {
      return false;
    }
  },

  createTrustedDeviceToken(userId: string): string {
    return jwt.sign({ _id: userId, purpose: "mfa-device" }, MFA_DEVICE_SECRET, { expiresIn: DEVICE_DURATION_SECONDS });
  },

  // Crée un challenge et envoie le code. Les anciens challenges ne sont PAS supprimés : ils alimentent
  // les compteurs par compte (tentatives + quota de création) sur la fenêtre glissante.
  async createChallenge(user: UserRecord): Promise<MfaChallengeCreation> {
    // Purge uniquement les lignes hors fenêtre (non comptées) pour borner la croissance de la table.
    await mfaChallengeRepository.deleteMany({ where: { userId: user.id, createdAt: { lt: windowStart() } } });

    const recentChallenges = await mfaChallengeRepository.count({ where: { userId: user.id, createdAt: { gte: windowStart() } } });
    if (recentChallenges >= MAX_CHALLENGES_PER_WINDOW || (await accountAttemptsExceeded(user.id))) {
      return { ok: false, reason: "throttled" };
    }

    const code = generateCode();
    const challenge = await mfaChallengeRepository.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash(code, SALT_ROUNDS),
        expiresAt: new Date(Date.now() + CHALLENGE_DURATION_MS),
        resendAfter: new Date(Date.now() + RESEND_COOLDOWN_MS),
      },
    });

    if (!(await deliverCode(user.email, code))) {
      await mfaChallengeRepository.deleteMany({ where: { id: challenge.id } });
      return { ok: false, reason: "send-failed" };
    }

    return { ok: true, token: signChallengeToken(challenge.id) };
  },

  async verifyAndConsumeChallenge(token: string, candidate: string): Promise<MfaVerificationResult> {
    const challengeId = decodeChallengeToken(token);
    if (!challengeId) {
      return { ok: false, reason: "invalid-token" };
    }

    const challenge = await mfaChallengeRepository.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) {
      return { ok: false, reason: "invalid-token" };
    }
    if (challenge.attemptCount >= MAX_ATTEMPTS_PER_CHALLENGE || (await accountAttemptsExceeded(challenge.userId))) {
      await mfaChallengeRepository.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
      return { ok: false, reason: "too-many-attempts" };
    }

    const match = await bcrypt.compare(candidate, challenge.codeHash);
    if (!match) {
      const updated = await mfaChallengeRepository.update({ where: { id: challenge.id }, data: { attemptCount: { increment: 1 } } });
      if (updated.attemptCount >= MAX_ATTEMPTS_PER_CHALLENGE || (await accountAttemptsExceeded(challenge.userId))) {
        await mfaChallengeRepository.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
        return { ok: false, reason: "too-many-attempts" };
      }
      return { ok: false, reason: "invalid-code" };
    }

    // Consommation atomique liée au codeHash vérifié : un resend concurrent (nouveau hash) ou une
    // seconde requête (consumedAt posé) fait échouer la condition → un seul gagnant, pas d'ancien code.
    const consumed = await mfaChallengeRepository.updateMany({
      where: { id: challenge.id, consumedAt: null, codeHash: challenge.codeHash },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      return { ok: false, reason: "invalid-token" };
    }

    const user = await userService.findUserById(challenge.userId);
    if (!user) {
      return { ok: false, reason: "invalid-token" };
    }
    return { ok: true, user };
  },

  async resendChallenge(token: string): Promise<MfaResendResult> {
    const challengeId = decodeChallengeToken(token);
    if (!challengeId) {
      return { ok: false, reason: "invalid-token" };
    }

    const challenge = await mfaChallengeRepository.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) {
      return { ok: false, reason: "invalid-token" };
    }
    if (await accountAttemptsExceeded(challenge.userId)) {
      return { ok: false, reason: "too-many-attempts" };
    }

    // Réservation atomique du créneau de renvoi : deux renvois concurrents ne produisent pas deux emails.
    const claimed = await mfaChallengeRepository.updateMany({
      where: { id: challenge.id, consumedAt: null, OR: [{ resendAfter: null }, { resendAfter: { lte: new Date() } }] },
      data: { resendAfter: new Date(Date.now() + RESEND_COOLDOWN_MS) },
    });
    if (claimed.count !== 1) {
      return { ok: false, reason: "cooldown" };
    }

    const user = await userService.findUserById(challenge.userId);
    if (!user) {
      return { ok: false, reason: "invalid-token" };
    }

    // Envoi AVANT d'écrire le nouveau hash : si Brevo échoue, l'ancien code reste valable.
    // expiresAt inchangé : le code reste aligné sur l'expiration du JWT intermédiaire.
    const code = generateCode();
    if (!(await deliverCode(user.email, code))) {
      return { ok: false, reason: "send-failed" };
    }
    await mfaChallengeRepository.update({ where: { id: challenge.id }, data: { codeHash: await bcrypt.hash(code, SALT_ROUNDS) } });

    return { ok: true };
  },
};
