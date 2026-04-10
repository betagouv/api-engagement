import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const handler = (req: any, res: any) => {
  res.status(429).send({
    ok: false,
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests, please try again later.",
  });
};

// 600 req/min par API key (fallback IP) — endpoints partenaires et webhooks
export const publisherRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  keyGenerator: (req) => (req.headers["x-api-key"] as string) || (req.headers["apikey"] as string) || ipKeyGenerator(req.ip ?? ""),
  handler,
});

// 120 req/min par IP — backoffice, iframe, redirect
export const ipRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler,
});
