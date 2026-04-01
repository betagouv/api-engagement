import { NextFunction, RequestHandler, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY } from "@/error";
import { metabaseService } from "@/services/metabase";
import { UserRequest } from "@/types/passport";

const router = Router();

const PUBLIC_METABASE_CARD = [
  "5525", // PUBLIC_STATS_GLOBAL
  "5538", // PUBLIC_STATS_GLOBAL_MONTHLY
  "5528", // PUBLIC_STATS_ACTIVE_MISSIONS
  "5535", // PUBLIC_STATS_ACTIVE_MISSIONS_DEPARTMENT
  "5531", // PUBLIC_STATS_ACTIVE_ORGANIZATIONS
  "5537", // PUBLIC_STATS_MISSIONS_DEPARTMENT
  "5536", // PUBLIC_STATS_MISSIONS_DOMAIN
];

const optionalUserAuthentication: RequestHandler = (req, res, next) =>
  passport.authenticate("user", { session: false }, (error: unknown, user?: UserRequest["user"]) => {
    if (error) {
      return next(error);
    }
    req.user = user;
    next();
  })(req, res, next);

router.post("/card/:cardId/query", optionalUserAuthentication, async (req: UserRequest, res: Response, next: NextFunction) => {
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

    // Endpoint should be public for /public-stats path but restrict the read of metabase card
    if (!req.user && !PUBLIC_METABASE_CARD.includes(params.data.cardId)) {
      return res.status(401).send();
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
});

export default router;
