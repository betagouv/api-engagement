import { NextFunction, Response } from "express";

import { FORBIDDEN, INVALID_BODY, NOT_FOUND } from "@/error";
import { publisherService } from "@/services/publisher";
import { UserRequest } from "@/types/passport";
import { getUserPublisherIds, hasAdminOrDirectPublisherAccess, hasAllPublisherAccess, normalizePublisherId, readRequiredParam } from "@/utils/publisher-access";

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

      const hasRelationAccess =
        hasAdminOrDirectPublisherAccess(req.user, publisher.id) || (await publisherService.hasPublisherRelationAccess(publisher.id, getUserPublisherIds(req.user)));
      if (!hasRelationAccess) {
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
