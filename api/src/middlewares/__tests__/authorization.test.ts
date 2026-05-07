import { describe, expect, it, vi } from "vitest";

import {
  hasAdminOrDirectPublisherAccess,
  hasAllPublisherAccess,
  requireAllPublisherAccess,
  requireDirectPublisherAccess,
} from "@/middlewares/authorization";
import { publisherService } from "@/services/publisher";

vi.mock("@/services/publisher", () => ({
  publisherService: {
    findOnePublisherById: vi.fn(),
  },
}));

const createResponse = () => {
  const res: any = {
    locals: {},
    status: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

const createRequest = (overrides: Partial<any> = {}) =>
  ({
    params: {},
    body: {},
    user: {
      role: "user",
      publishers: ["publisher-1"],
    },
    ...overrides,
  }) as any;

describe("authorization middleware", () => {
  it("allows an admin", async () => {
    const req = createRequest({ user: { role: "admin", publishers: [] } });
    const res = createResponse();
    const next = vi.fn();

    await requireAllPublisherAccess({
      resolvePublisherIds: async () => ({ publisherIds: ["publisher-2"] }),
    })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects all-access when only one resolved publisher is accessible", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await requireAllPublisherAccess({
      resolvePublisherIds: async () => ({ publisherIds: ["publisher-1", "publisher-2"], locals: { resource: { id: "resource-1" } } }),
    })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ ok: false, code: "FORBIDDEN" }));
    expect(res.locals.resource).toBeUndefined();
  });

  it("returns 404 when the loaded object does not exist", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await requireAllPublisherAccess({
      resolvePublisherIds: async () => null,
    })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ ok: false, code: "NOT_FOUND" }));
  });

  it("passes loader errors to next", async () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();
    const error = new Error("loader failed");

    await requireAllPublisherAccess({
      resolvePublisherIds: async () => {
        throw error;
      },
    })(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("applies the dedicated API key rule", async () => {
    vi.mocked(publisherService.findOnePublisherById).mockResolvedValueOnce({ id: "publisher-1" } as any);
    const req = createRequest({ params: { id: "publisher-1" } });
    const res = createResponse();
    const next = vi.fn();

    await requireDirectPublisherAccess({ idParam: "id" })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.publisher).toEqual({ id: "publisher-1" });
  });

  it("rejects API key access when the publisher is not directly attached", async () => {
    vi.mocked(publisherService.findOnePublisherById).mockResolvedValueOnce({ id: "publisher-2" } as any);
    const req = createRequest({ params: { id: "publisher-2" } });
    const res = createResponse();
    const next = vi.fn();

    await requireDirectPublisherAccess({ idParam: "id" })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("exposes consistent helpers", () => {
    expect(hasAdminOrDirectPublisherAccess({ role: "admin", publishers: [] }, "publisher-1")).toBe(true);
    expect(hasAdminOrDirectPublisherAccess({ role: "user", publishers: ["publisher-1"] }, "publisher-1")).toBe(true);
    expect(hasAdminOrDirectPublisherAccess({ role: "user", publishers: ["publisher-1"] }, "publisher-2")).toBe(false);
    expect(hasAllPublisherAccess({ role: "user", publishers: ["publisher-1"] }, ["publisher-2", "publisher-1"])).toBe(false);
  });
});
