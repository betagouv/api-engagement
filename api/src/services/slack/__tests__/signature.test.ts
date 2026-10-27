import { createHmac, randomBytes } from "crypto";
import { describe, expect, it } from "vitest";

import { verifySlackSignature } from "@/services/slack/signature";

const secret = randomBytes(16).toString("hex");
const rawBody = Buffer.from("payload=%7B%7D");
const now = 1_700_000_000_000;
const timestamp = String(now / 1000);
const sign = (ts: string, body: Buffer = rawBody) => `v0=${createHmac("sha256", secret).update(`v0:${ts}:`).update(body).digest("hex")}`;

describe("verifySlackSignature", () => {
  it("accepts a valid signature", () => {
    expect(verifySlackSignature({ secret, timestamp, signature: sign(timestamp), rawBody, now })).toBe(true);
  });

  it("rejects a wrong signature, a tampered body and a wrong secret", () => {
    expect(verifySlackSignature({ secret, timestamp, signature: "v0=bad", rawBody, now })).toBe(false);
    expect(verifySlackSignature({ secret, timestamp, signature: sign(timestamp), rawBody: Buffer.from("payload=x"), now })).toBe(false);
    expect(verifySlackSignature({ secret: "other", timestamp, signature: sign(timestamp), rawBody, now })).toBe(false);
  });

  it("rejects stale or invalid timestamps", () => {
    const stale = String(now / 1000 - 3600);
    expect(verifySlackSignature({ secret, timestamp: stale, signature: sign(stale), rawBody, now })).toBe(false);
    expect(verifySlackSignature({ secret, timestamp: "abc", signature: sign("abc"), rawBody, now })).toBe(false);
  });

  it("rejects when the secret or any input is missing", () => {
    expect(verifySlackSignature({ secret: undefined, timestamp, signature: sign(timestamp), rawBody, now })).toBe(false);
    expect(verifySlackSignature({ secret, timestamp, signature: undefined, rawBody, now })).toBe(false);
    expect(verifySlackSignature({ secret, timestamp, signature: sign(timestamp), rawBody: undefined, now })).toBe(false);
  });
});
