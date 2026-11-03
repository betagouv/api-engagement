import { Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { DemarcheSimplifieeFieldType } from "@/db/core";
import { INVALID_BODY, INVALID_QUERY, NOT_FOUND, SERVER_ERROR, captureException } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import demarchesSimplifiees from "@/services/demarches-simplifiees";
import { publisherDemarcheSimplifieesService } from "@/services/publisher-demarches-simplifiees";
import statEventService from "@/services/stat-event";
import { UserRequest } from "@/types/passport";
import { appendAuditEvent } from "@/utils/audit-log";

const router = Router();
router.use(ipRateLimiter);

// Résout une démarche à partir de son URL publique (/commencer/<slug>) : numéro, nom et clé d'annotation.
// Utilisé par le back-office pour préremplir la config Démarches Simplifiées d'un publisher.
// Si `publisherId` est fourni et que ce publisher a enregistré son propre token API, on l'utilise (sinon token global).
router.get("/resolve", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const query = zod.object({ url: zod.url(), publisherId: zod.string().optional() }).safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const token = query.data.publisherId ? await publisherDemarcheSimplifieesService.findTokenByPublisherId(query.data.publisherId) : null;
    const result = await demarchesSimplifiees.resolveDemarcheByUrl(query.data.url, token);
    if (!result.ok) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: result.message });
    }

    return res.status(200).send({ ok: true, data: result.data });
  } catch (error) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

// Indique si le jeton (celui du partenaire si `publisherId` est fourni et qu'il en a un, sinon le nôtre) a accès à la démarche et à ses dossiers (nécessaire au job d'import des candidatures).
// Utilisé par le back-office pour signaler les démarches dont le compte du jeton n'est pas instructeur.
router.get("/access", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const query = zod.object({ number: zod.coerce.number().int().positive(), publisherId: zod.string().optional() }).safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const token = query.data.publisherId ? await publisherDemarcheSimplifieesService.findTokenByPublisherId(query.data.publisherId) : null;
    const data = await demarchesSimplifiees.getDemarcheAccess(query.data.number, token);
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

// Teste la config d'une démarche sur un dossier réel, comme le ferait le job d'import des candidatures (lecture seule) :
// identifiant de la redirection, existence du clic en base et attributs candidat extraits avec les champs donnés.
// En POST pour recevoir les champs qualifiés en objet (config affichée, même non enregistrée) ; rien n'est écrit.
router.post("/check-dossier", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const body = zod
      .object({
        dossierNumber: zod.coerce.number().int().positive(),
        demarcheNumber: zod.coerce.number().int().positive(),
        url: zod.string().nullable().default(null),
        fields: zod.partialRecord(zod.enum(DemarcheSimplifieeFieldType), zod.string().nullish()).default({}),
        publisherId: zod.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const { dossierNumber, demarcheNumber, url, fields, publisherId } = body.data;
    const token = publisherId ? await publisherDemarcheSimplifieesService.findTokenByPublisherId(publisherId) : null;
    const result = await demarchesSimplifiees.checkDossier(dossierNumber, { number: demarcheNumber, url, fields }, token);
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

// Vérifie le token API fourni par un partenaire auprès de Démarche Numérique, puis l'enregistre (chiffré) sur le publisher.
// Permet de valider le token sans enregistrer tout le formulaire du partenaire.
router.post("/token", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response) => {
  try {
    const body = zod.object({ publisherId: zod.string().min(1), token: zod.string().trim().min(1) }).safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const check = await demarchesSimplifiees.checkToken(body.data.token);
    if (!check.ok) {
      // Pas de 401 vers le back-office : il le traiterait comme une session expirée.
      const isRejected = check.status === 401 || check.status === 403;
      return res
        .status(isRejected ? 400 : 502)
        .send({ ok: false, code: isRejected ? INVALID_BODY : SERVER_ERROR, message: isRejected ? "Token refusé par Démarche Numérique" : check.message });
    }

    const saved = await publisherDemarcheSimplifieesService.saveToken(body.data.publisherId, body.data.token);
    if (!saved) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    appendAuditEvent(req, {
      action: "publisher.demarche_simplifiee_token.update",
      outcome: "success",
      target: { type: "publisher", id: body.data.publisherId },
    });
    return res.status(200).send({ ok: true });
  } catch (error) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

export default router;
