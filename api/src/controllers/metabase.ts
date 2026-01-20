import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY } from "../error";
import { metabaseService } from "../services/metabase";
import { UserRequest } from "../types/passport";

const router = Router();

router.post("/card/:cardId/query", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
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
});

export default router;
