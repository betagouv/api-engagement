import helmet from "helmet";

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://plausible.io"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      frameAncestors: ["'self'", "https://generation.paris2024.org"],
    },
  },
  crossOriginOpenerPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
  noSniff: true,
});

export default helmetConfig;
