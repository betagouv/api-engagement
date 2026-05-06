import { NextFunction, Response } from "express";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherService } from "@/services/publisher";
import { UserRequest } from "@/types/passport";

type PublisherAccessResolution = {
  publisherIds: string[];
  locals?: Record<string, unknown>;
} | null;

type ResolvePublisherIds = (req: UserRequest, res: Response) => Promise<PublisherAccessResolution>;

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

export const canAccessPublisher = (user: UserRequest["user"], publisherId: string): boolean => {
  if (isAdmin(user)) {
    return true;
  }
  return getUserPublisherIds(user).includes(publisherId);
};

export const canManageApiKey = (user: UserRequest["user"], publisherId: string): boolean => canAccessPublisher(user, publisherId);

export const authorizePublisherAccess =
  ({ resolvePublisherIds }: { resolvePublisherIds: ResolvePublisherIds }) =>
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const resolution = await resolvePublisherIds(req, res);
      if (!resolution) {
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }

      if (resolution.locals) {
        Object.assign(res.locals, resolution.locals);
      }

      const publisherIds = resolution.publisherIds.map(normalizePublisherId).filter((publisherId): publisherId is string => Boolean(publisherId));
      if (!publisherIds.length || !publisherIds.some((publisherId) => canAccessPublisher(req.user, publisherId))) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const authorizeApiKeyAccess =
  ({ idParam }: { idParam: string }) =>
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const publisherId = normalizePublisherId(req.params[idParam]);
      if (!publisherId) {
        return res.status(400).send({ ok: false, code: INVALID_PARAMS });
      }

      const publisher = await publisherService.findOnePublisherById(publisherId);
      if (!publisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
      }

      res.locals.publisher = publisher;

      if (!canManageApiKey(req.user, publisher.id)) {
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
  if (!publisherIds.some((publisherId) => canAccessPublisher(req.user, publisherId))) {
    return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
  }

  next();
};
