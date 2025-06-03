import { rateLimit } from "express-rate-limit";

import { BENEVOLAT_URL, VOLONTARIAT_URL } from "../config";
import { captureMessage } from "../error";

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 1 minute).
  skip: (req) => {
    // if request is from BENEVOLAT_URL or VOLONTARIAT_URL, skip rate limiting
    // Letting the console.log here to test the ip from the widget
    console.log("req.headers.referer", req.headers.referer, req.headers.origin, req.ip);
    if ([BENEVOLAT_URL, VOLONTARIAT_URL].includes(req.headers.referer || "")) {
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
