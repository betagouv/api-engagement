import { NextFunction, Response } from "express";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherService } from "@/services/publisher";
import { UserRequest } from "@/types/passport";
import { hasAdminOrDirectPublisherAccess, hasAllPublisherAccess, hasPublisherRelationAccess, isAdmin, normalizePublisherId, readRequiredParam } from "@/utils/publisher-access";

/** Emplacements d'où extraire un identifiant de publisher dans la requête. */
type RequestSource = "body" | "query" | "params";

/** Comportement quand l'identifiant est absent de la requête. */
type OnMissingPublisherId = "reject" | "adminOnly" | "skip";

/** Lit une valeur via un chemin pointé (ex. "variables.publisher_id"). */
const readPath = (root: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, segment) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[segment] : undefined), root);

const readPublisherIdFrom = (req: UserRequest, source: RequestSource, key: string): string | null => normalizePublisherId(readPath(req[source], key));

type PublisherAccessResolution = {
  publisherIds: string[];
  locals?: Record<string, unknown>;
} | null;

type ResolvePublisherIds = (req: UserRequest, res: Response) => Promise<PublisherAccessResolution>;
type PublisherAccessPredicate = (user: UserRequest["user"], publisherIds: string[]) => boolean;

const requirePublisherAccess =
  ({ resolvePublisherIds, canAccess }: { resolvePublisherIds: ResolvePublisherIds; canAccess: PublisherAccessPredicate }) =>
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const resolution = await resolvePublisherIds(req, res);
      if (res.headersSent) {
        return;
      }
      if (!resolution) {
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }

      const publisherIds = resolution.publisherIds.map(normalizePublisherId).filter((publisherId): publisherId is string => Boolean(publisherId));
      if (!publisherIds.length || !canAccess(req.user, publisherIds)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      }

      if (resolution.locals) {
        Object.assign(res.locals, resolution.locals);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const requireAllPublisherAccess = ({ resolvePublisherIds }: { resolvePublisherIds: ResolvePublisherIds }) =>
  requirePublisherAccess({ resolvePublisherIds, canAccess: hasAllPublisherAccess });

export const requireDirectPublisherAccess =
  ({ idParam }: { idParam: string }) =>
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const publisherId = readRequiredParam(req, res, idParam);
      if (!publisherId) {
        return;
      }

      if (!hasAdminOrDirectPublisherAccess(req.user, publisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const requirePublisherRelationAccess =
  ({ idParam }: { idParam: string }) =>
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const publisherId = readRequiredParam(req, res, idParam);
      if (!publisherId) {
        return;
      }

      const publisher = await publisherService.findOnePublisherById(publisherId);
      if (!publisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
      }

      res.locals.publisher = publisher;

      if (!hasPublisherRelationAccess(req.user, publisher)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const authorizeStatsSearch = () => (req: UserRequest, res: Response, next: NextFunction) => {
  const fromPublisherId = normalizePublisherId(req.body?.fromPublisherId);
  const toPublisherId = normalizePublisherId(req.body?.toPublisherId);

  if (!fromPublisherId && !toPublisherId) {
    return res.status(400).send({
      ok: false,
      code: INVALID_BODY,
      error: "Missing fromPublisherId or toPublisherId",
    });
  }

  const publisherIds = [fromPublisherId, toPublisherId].filter((publisherId): publisherId is string => Boolean(publisherId));
  if (!hasAllPublisherAccess(req.user, publisherIds)) {
    return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
  }

  next();
};

/**
 * Vérifie qu'un identifiant de publisher fourni dans la requête appartient bien
 * au périmètre de l'utilisateur authentifié (ou qu'il est admin).
 *
 * `key` accepte un chemin pointé pour les identifiants imbriqués
 * (ex. `variables.publisher_id` dans un payload Metabase).
 *
 * Corrige les IDOR du type "n'importe quel utilisateur connecté peut passer le
 * publisherId d'un autre tenant" (ex. `GET /stats-mean?publisherId=...`,
 * `POST /metabase/card/:cardId/query`).
 *
 * `onMissing` règle le cas où l'identifiant est absent :
 * - `"reject"` (défaut) : 400 (l'identifiant est obligatoire).
 * - `"adminOnly"` : seul un admin passe (évite l'exposition des agrégats globaux).
 * - `"skip"` : on laisse passer (ex. cartes Metabase publiques sans publisher_id) ;
 *   le contrôle d'accès reste assuré dès qu'un identifiant est présent.
 */
export const requirePublisherAccessFrom =
  ({ source, key, onMissing = "reject" }: { source: RequestSource; key: string; onMissing?: OnMissingPublisherId }) =>
  (req: UserRequest, res: Response, next: NextFunction) => {
    const publisherId = readPublisherIdFrom(req, source, key);

    if (!publisherId) {
      if (onMissing === "reject") {
        return res.status(400).send({ ok: false, code: source === "params" ? INVALID_PARAMS : INVALID_BODY, message: `Missing ${key}` });
      }
      if (onMissing === "adminOnly" && !isAdmin(req.user)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      }
      return next();
    }

    if (!hasAdminOrDirectPublisherAccess(req.user, publisherId)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
    }

    next();
  };
