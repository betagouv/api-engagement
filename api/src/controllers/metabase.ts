import { NextFunction, RequestHandler, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { METABASE_CARD_ACCESS } from "@/constants/metabase";
import { FORBIDDEN, INVALID_BODY } from "@/error";
import { requirePublisherAccessFrom } from "@/middlewares/authorization";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { metabaseService } from "@/services/metabase";
import { UserRequest } from "@/types/passport";

const router = Router();
router.use(ipRateLimiter);

const optionalUserAuthentication: RequestHandler = (req, res, next) =>
  passport.authenticate("user", { session: false }, (error: unknown, user?: UserRequest["user"]) => {
    if (error) {
      return next(error);
    }
    req.user = user;
    next();
  })(req, res, next);

// Autorise la carte selon la liste blanche cardId -> rôle (carte inconnue => refus).
const authorizeMetabaseCard: RequestHandler = (req: UserRequest, res: Response, next: NextFunction) => {
  const access = METABASE_CARD_ACCESS[String(req.params.cardId)];

  if (!access) {
    return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Card not allowed" });
  }
  if (access === "public") {
    return next();
  }
  if (!req.user) {
    return res.status(401).send();
  }
  if (access === "admin" && req.user.role !== "admin") {
    return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
  }
  // Carte "user" : le publisher_id est obligatoire, sinon Metabase pourrait renvoyer les données de tous les tenants.
  if (access === "user" && !req.body?.variables?.publisher_id) {
    return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Missing variables.publisher_id" });
  }

  next();
};

router.post(
  "/card/:cardId/query",
  optionalUserAuthentication,
  // Autorise la carte selon son niveau d'accès (public / user / admin).
  authorizeMetabaseCard,
  // Scope les cartes "user" au tenant de l'appelant via variables.publisher_id (absent => laisse passer).
  requirePublisherAccessFrom({ source: "body", key: "variables.publisher_id" }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const params = zod
        .object({
          cardId: zod.union([zod.string(), zod.number()]).transform((v) => v.toString()),
        })
        .safeParse(req.params);
      if (!params.success) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, error: params.error });
      }

      const body = zod
        .object({
          variables: zod.record(zod.string(), zod.union([zod.string(), zod.number(), zod.boolean(), zod.array(zod.union([zod.string(), zod.number()]))])).optional(),
          parameters: zod.array(zod.unknown()).optional(),
          body: zod.record(zod.string(), zod.unknown()).optional(),
        })
        .safeParse(req.body);
      if (!body.success) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
      }

      try {
        const metabaseResponse = await metabaseService.queryCard(params.data.cardId, {
          variables: body.data.variables,
          parameters: body.data.parameters,
          body: body.data.body,
        });

        return res.status(metabaseResponse.status ?? 200).send({
          ok: metabaseResponse.ok,
          data: metabaseResponse.data,
        });
      } catch (err: any) {
        const message = err?.message || "Erreur Metabase";
        const status = message.toLowerCase().includes("metabase") ? 400 : 502;

        return res.status(status).send({ ok: false, error: message });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
