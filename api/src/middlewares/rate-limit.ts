import { ipKeyGenerator, rateLimit, RateLimitRequestHandler } from "express-rate-limit";

import { RATE_LIMIT_IP_MAX, RATE_LIMIT_PUBLISHER_MAX } from "@/config";

const handler = (req: any, res: any) => {
  res.status(429).send({
    ok: false,
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests, please try again later.",
  });
};

const isDisabled = () => process.env.RATE_LIMIT_DISABLED === "true";

// 600 req/min par publisher — endpoints partenaires et webhooks
// Appliqué après passport.authenticate : req.user.id est résolu.
// Fallback IP si req.user est absent (ex: route sans auth).
export const createPublisherRateLimiter = (limit = RATE_LIMIT_PUBLISHER_MAX): RateLimitRequestHandler =>
  rateLimit({
    windowMs: 60_000,
    limit,
    keyGenerator: (req) => {
      const user = req.user as { id?: string } | undefined;
      return user?.id ?? ipKeyGenerator(req.ip ?? "");
    },
    handler,
    skip: isDisabled,
  });

// 120 req/min par IP — backoffice, iframe, redirect
export const createIpRateLimiter = (limit = RATE_LIMIT_IP_MAX): RateLimitRequestHandler =>
  rateLimit({
    windowMs: 60_000,
    limit,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
    handler,
    skip: isDisabled,
  });

export const publisherRateLimiter = createPublisherRateLimiter();
export const ipRateLimiter = createIpRateLimiter();
