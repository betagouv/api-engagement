import { RequestHandler } from "express";

import { APP_URL } from "@/config";
import { FORBIDDEN } from "@/error";

const appOrigin = new URL(APP_URL).origin;

// Le cookie MFA est envoyé automatiquement (SameSite=None) : CORS seul
// n'empêche pas l'exécution d'un POST forgé. Les routes de connexion sont
// réservées à l'app ; exiger son origine protège aussi la création du cookie.
// Une origine absente ou opaque ("null") est refusée, même sans cookie.
export const loginCsrfProtection: RequestHandler = (req, res, next) => {
  if (req.get("Origin") !== appOrigin) {
    res.status(403).send({ ok: false, code: FORBIDDEN, message: "Invalid request origin" });
    return;
  }

  next();
};
