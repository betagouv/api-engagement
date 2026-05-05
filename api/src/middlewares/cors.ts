import cors from "cors";

import { ADMIN_SNU_URL, APP_URL, ASSOCIATION_URL, BENEVOLAT_URL, JVA_URL, VOLONTARIAT_URL } from "@/config";

const origin = [
  APP_URL,
  ASSOCIATION_URL,
  VOLONTARIAT_URL,
  BENEVOLAT_URL,
  JVA_URL,
  ADMIN_SNU_URL,
  // SNU admin staging
  "https://app-735c50af-69c1-4a10-ac30-7ba11d1112f7.cleverapps.io",
  "https://app-ec11b799-95d0-4770-8e41-701b4becf64a.cleverapps.io",
  // POC
  "https://pocbd543737-poc-app.functions.fnc.fr-par.scw.cloud", // App
  "https://pocbd543737-poc-plateform.functions.fnc.fr-par.scw.cloud", // Plateform
];

export const corsOptions = { credentials: true, origin };

export const corsPublic = cors({ origin: "*" });

// Middleware pour les endpoints POC : CORS * + gestion explicite du preflight OPTIONS
export const corsPoc = (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
};
