import { Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY, NOT_FOUND, SERVER_ERROR, captureException } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import demarchesSimplifiees from "@/services/demarches-simplifiees";
import { UserRequest } from "@/types/passport";

const router = Router();
router.use(ipRateLimiter);

// Résout une démarche à partir de son URL publique (/commencer/<slug>) : numéro, nom et clé d'annotation.
// Utilisé par le back-office pour préremplir la config Démarches Simplifiées d'un publisher.
router.get("/resolve", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const query = zod.object({ url: zod.url() }).safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const result = await demarchesSimplifiees.resolveDemarcheByUrl(query.data.url);
    if (!result.ok) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: result.message });
    }

    return res.status(200).send({ ok: true, data: result.data });
  } catch (error) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

export default router;
