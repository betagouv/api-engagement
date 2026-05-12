import { Response } from "express";

import { INVALID_PARAMS } from "@/error";
import { UserRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";

export const normalizePublisherId = (publisherId: unknown): string | null => {
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
  return user.publishers;
};

export const isAdmin = (user: UserRequest["user"]): boolean => user?.role === "admin";

export const hasDirectPublisherAccess = (user: UserRequest["user"], publisherId: string): boolean => getUserPublisherIds(user).includes(publisherId);

export const hasAdminOrDirectPublisherAccess = (user: UserRequest["user"], publisherId: string): boolean => {
  if (isAdmin(user)) {
    return true;
  }
  return hasDirectPublisherAccess(user, publisherId);
};

export const hasAllPublisherAccess = (user: UserRequest["user"], publisherIds: string[]): boolean =>
  publisherIds.every((publisherId) => hasAdminOrDirectPublisherAccess(user, publisherId));

export const hasPublisherRelationAccess = (user: UserRequest["user"], publisher: PublisherRecord): boolean => {
  if (hasAdminOrDirectPublisherAccess(user, publisher.id)) {
    return true;
  }
  return publisher.publishers.some((diffusion) => hasDirectPublisherAccess(user, diffusion.diffuseurPublisherId));
};

export const readRequiredParam = (req: UserRequest, res: Response, paramName: string): string | null => {
  const value = normalizePublisherId(req.params[paramName]);
  if (!value) {
    res.status(400).send({ ok: false, code: INVALID_PARAMS });
    return null;
  }
  return value;
};
