import { rateLimit } from "express-rate-limit";

import { APP_URL, BENEVOLAT_URL, VOLONTARIAT_URL } from "@/config";
import { captureMessage } from "@/error";

const limiter = rateLimit({
  windowMs: 5000, // 5 second
  limit: 15, // Limit each IP to 15 requests per `window` (5 r/s).
  skip: (req) => {
    // Skip back office and iframe requests
    if ([APP_URL, BENEVOLAT_URL, VOLONTARIAT_URL].includes(req.headers.origin || "")) {
      return true;
    }
    if (req.url.includes("/iframe/")) {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    captureMessage(`Too many requests, please try again later.`, {
      extra: {
        ip: req.ip,
        url: req.url,
        method: req.method,
      },
    });
    res.status(429).send({
      ok: false,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later.",
    });
  },
});

export default limiter;
