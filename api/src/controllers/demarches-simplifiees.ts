import { Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY, NOT_FOUND, SERVER_ERROR, captureException } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import demarchesSimplifiees from "@/services/demarches-simplifiees";
import { UserRequest } from "@/types/passport";

const router = Router();
router.use(ipRateLimiter);

// Récupère la clé de l'annotation "Identifiant de la redirection" d'une démarche à partir de son numéro.
// Utilisé par le back-office pour préremplir la config Démarches Simplifiées d'un publisher.
router.get("/annotation", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const query = zod.object({ demarcheNumber: zod.coerce.number().int().positive() }).safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const result = await demarchesSimplifiees.getAnnotationId(query.data.demarcheNumber);
    if (!result.ok) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: result.message });
    }

    return res.status(200).send({ ok: true, data: { annotationKey: result.data } });
  } catch (error) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

export default router;
