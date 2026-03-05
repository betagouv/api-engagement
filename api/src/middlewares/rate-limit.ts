import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export const defaultRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  keyGenerator: (req) => (req.headers["x-api-key"] as string) || (req.headers["apikey"] as string) || ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).send({
      ok: false,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later.",
    });
  },
});
