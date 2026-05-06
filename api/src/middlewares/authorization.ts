import { NextFunction, Response } from "express";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherService } from "@/services/publisher";
import { UserRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";

type PublisherAccessResolution = {
  publisherIds: string[];
  locals?: Record<string, unknown>;
} | null;

type ResolvePublisherIds = (req: UserRequest, res: Response) => Promise<PublisherAccessResolution>;
type PublisherAccessPredicate = (user: UserRequest["user"], publisherIds: string[]) => boolean;

const normalizePublisherId = (publisherId: unknown): string | null => {
  if (typeof publisherId !== "string") {
    return null;
  }
  const value = publisherId.trim();
  return value || null;
};

export const getUserPublisherIds = (user: UserRequest["user"]): string[] => {
  if (!user?.publishers || !Array.isArray(user.publishers)) {
    return [];
  }
  return user.publishers.map((publisherId: string) => publisherId.toString());
};

export const isAdmin = (user: UserRequest["user"]): boolean => user?.role === "admin";

export const hasDirectPublisherAccess = (user: UserRequest["user"], publisherId: string): boolean => getUserPublisherIds(user).includes(publisherId);

export const hasAdminOrDirectPublisherAccess = (user: UserRequest["user"], publisherId: string): boolean => {
  if (isAdmin(user)) {
    return true;
  }
  return hasDirectPublisherAccess(user, publisherId);
};

export const hasAnyPublisherAccess = (user: UserRequest["user"], publisherIds: string[]): boolean =>
  publisherIds.some((publisherId) => hasAdminOrDirectPublisherAccess(user, publisherId));

export const hasAllPublisherAccess = (user: UserRequest["user"], publisherIds: string[]): boolean =>
  publisherIds.every((publisherId) => hasAdminOrDirectPublisherAccess(user, publisherId));

export const canManageApiKey = (user: UserRequest["user"], publisherId: string): boolean => hasAdminOrDirectPublisherAccess(user, publisherId);

export const readRequiredParam = (req: UserRequest, res: Response, paramName: string): string | null => {
  const value = normalizePublisherId(req.params[paramName]);
  if (!value) {
    res.status(400).send({ ok: false, code: INVALID_PARAMS });
    return null;
  }
  return value;
};

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

export const requireAnyPublisherAccess = ({ resolvePublisherIds }: { resolvePublisherIds: ResolvePublisherIds }) =>
  requirePublisherAccess({ resolvePublisherIds, canAccess: hasAnyPublisherAccess });

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

      const publisher = await publisherService.findOnePublisherById(publisherId);
      if (!publisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
      }

      res.locals.publisher = publisher;

      if (!hasAdminOrDirectPublisherAccess(req.user, publisher.id)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

const hasPublisherRelationAccess = (user: UserRequest["user"], publisher: PublisherRecord): boolean => {
  if (hasAdminOrDirectPublisherAccess(user, publisher.id)) {
    return true;
  }
  return publisher.publishers.some((diffusion) => hasDirectPublisherAccess(user, diffusion.diffuseurPublisherId));
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
