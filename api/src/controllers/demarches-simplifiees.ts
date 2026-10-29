import { Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY, NOT_FOUND, SERVER_ERROR, captureException } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import demarchesSimplifiees from "@/services/demarches-simplifiees";
import statEventService from "@/services/stat-event";
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

// Indique si notre jeton a accès à la démarche et à ses dossiers (nécessaire au job d'import des candidatures).
// Utilisé par le back-office pour signaler les démarches dont le compte du jeton n'est pas instructeur.
router.get("/access", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const query = zod.object({ number: zod.coerce.number().int().positive() }).safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await demarchesSimplifiees.getDemarcheAccess(query.data.number);
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

// Teste la config d'une démarche sur un dossier réel, comme le ferait le job d'import des candidatures (lecture seule) :
// identifiant de la redirection, existence du clic en base et attributs candidat extraits avec les champs donnés.
router.get("/check-dossier", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const query = zod
      .object({
        dossierNumber: zod.coerce.number().int().positive(),
        demarcheNumber: zod.coerce.number().int().positive(),
        url: zod.string().nullable().default(null),
        birthDateField: zod.string().nullable().default(null),
        countryField: zod.string().nullable().default(null),
        postalCodeField: zod.string().nullable().default(null),
      })
      .safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const { dossierNumber, demarcheNumber, ...demarche } = query.data;
    const result = await demarchesSimplifiees.checkDossier(dossierNumber, { number: demarcheNumber, ...demarche });
    if (!result.ok) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: result.message });
    }

    const click = result.data.redirectionId ? await statEventService.findOneStatEventById(result.data.redirectionId) : null;
    return res.status(200).send({ ok: true, data: { ...result.data, clickFound: Boolean(click) } });
  } catch (error) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

export default router;
