import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_SECONDS = 300;

// Vérifie la signature `v0` d'une requête Slack (https://api.slack.com/authentication/verifying-requests-from-slack) :
// HMAC SHA-256 de `v0:<timestamp>:<corps brut>`, timestamp de moins de 5 minutes, comparaison en temps constant.
export const verifySlackSignature = ({
  secret,
  timestamp,
  signature,
  rawBody,
  now = Date.now(),
}: {
  secret?: string;
  timestamp?: string;
  signature?: string;
  rawBody?: Buffer;
  now?: number;
}) => {
  if (!secret || !timestamp || !signature || !rawBody) {
    return false;
  }
  if (!(Math.abs(now / 1000 - Number(timestamp)) <= MAX_AGE_SECONDS)) {
    return false;
  }
  const expected = Buffer.from(`v0=${createHmac("sha256", secret).update(`v0:${timestamp}:`).update(rawBody).digest("hex")}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
};
