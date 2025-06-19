import { rateLimit } from "express-rate-limit";

import { APP_URL, BENEVOLAT_URL, VOLONTARIAT_URL } from "../config";
import { captureMessage } from "../error";

const limiter = rateLimit({
  windowMs: 5000, // 5 second
  limit: 15, // Limit each IP to 15 requests per `window` (5 r/s).
  skip: (req) => {
    // if request is from BENEVOLAT_URL or VOLONTARIAT_URL, skip rate limiting

    // Letting the console.log here to test the ip from the widget
    console.log("req.headers.referer", req.headers.origin, req.ip);
    if ([APP_URL, BENEVOLAT_URL, VOLONTARIAT_URL].includes(req.headers.origin || "")) {
      console.log("skipping rate limiting");
      return true;
    }
    console.log("req.url", req.url);
    if (req.url.includes("/iframe/")) {
      console.log("skipping rate limiting iframe");
      return true;
    }
    console.log("not skipping rate limiting");
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
