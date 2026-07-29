import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 8080;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Le conteneur ne reçoit aucune variable d'environnement au runtime : les hostnames API/widget/Sentry
// (différents par environnement) sont inconnus ici, d'où les sources génériques "https:" ci-dessous.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "script-src": ["'self'", "https://plausible.io"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "https:", "data:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'", "https:"],
        "frame-src": ["https:"],
        "worker-src": ["'self'", "blob:"],
        "form-action": ["'self'"],
        "upgrade-insecure-requests": [],
      },
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    // jstag.js est chargé en <script> cross-origin par les sites partenaires : le CORP "same-origin"
    // par défaut de helmet bloquerait ce chargement.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// geolocation reste déléguable : l'aperçu du widget (iframe allow="geolocation") en a besoin.
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=()");
  next();
});

app.use(express.static(path.join(__dirname, "../dist")));

app.get("/.well-known/security.txt", (req, res) => {
  res.type("text/plain").sendFile(path.join(__dirname, "../dist/.well-known/security.txt"));
});

app.get("/.well-known/security-policy.txt", (req, res) => {
  res.type("text/plain").sendFile(path.join(__dirname, "../dist/.well-known/security-policy.txt"));
});

app.get("/linkedin.xml", function (req, res) {
  res.redirect(301, "https://api-engagement-bucket.s3.fr-par.scw.cloud/xml/linkedin.xml");
});

app.route("/*all").all((req, res) => {
  res.status(200).sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
  console.log(`App listening at port:${port}`);
});
