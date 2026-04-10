import { ipKeyGenerator, rateLimit, RateLimitRequestHandler } from "express-rate-limit";

import { RATE_LIMIT_IP_MAX, RATE_LIMIT_PUBLISHER_MAX } from "@/config";

const handler = (req: any, res: any) => {
  res.status(429).send({
    ok: false,
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests, please try again later.",
  });
};

// 600 req/min par IP — endpoints partenaires et webhooks
// Clé sur IP uniquement : les headers x-api-key/apikey ne sont pas encore
// vérifiés à ce stade (avant passport.authenticate), les utiliser comme clé
// permettrait de contourner la limite en les faisant varier.
export const createPublisherRateLimiter = (limit = RATE_LIMIT_PUBLISHER_MAX): RateLimitRequestHandler =>
  rateLimit({
    windowMs: 60_000,
    limit,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
    handler,
  });

// 120 req/min par IP — backoffice, iframe, redirect
export const createIpRateLimiter = (limit = RATE_LIMIT_IP_MAX): RateLimitRequestHandler =>
  rateLimit({
    windowMs: 60_000,
    limit,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
    handler,
  });

export const publisherRateLimiter = createPublisherRateLimiter();
export const ipRateLimiter = createIpRateLimiter();
