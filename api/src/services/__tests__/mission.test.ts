import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueMock, captureExceptionMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock("@/services/mission-enrichment", () => ({
  missionEnrichmentService: { enqueue: enqueueMock },
  buildMissionEnrichmentScoringWhere: vi.fn(),
}));

vi.mock("@/error", () => ({
  captureException: captureExceptionMock,
}));

import { prisma } from "@/db/postgres";
import { missionService } from "@/services/mission";

const prismaMock = prisma as unknown as {
  mission: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  publisherDiffusionRule: { findMany: ReturnType<typeof vi.fn> };
};

describe("missionService.enqueueMissionProcessing", () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    captureExceptionMock.mockReset();
  });

  it("delegates enqueueing to the enrichment service", async () => {
    enqueueMock.mockResolvedValue(undefined);

    await missionService.enqueueMissionProcessing("mission-1");

    expect(enqueueMock).toHaveBeenCalledWith("mission-1");
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("does not propagate queue errors because enqueueing is best-effort", async () => {
    const error = new Error("You do not have sufficient access to perform this action.");
    enqueueMock.mockRejectedValue(error);

    await expect(missionService.enqueueMissionProcessing("mission-1")).resolves.toBeUndefined();

    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      extra: { context: "enqueueMissionProcessing", missionId: "mission-1" },
    });
  });
});

describe("missionService.findMissions (diffusion multi-scopes)", () => {
  const buildRule = (overrides: Record<string, unknown> = {}) => ({
    id: "rule-1",
    publisherId: "diffuseur-1",
    combinedWithId: null,
    field: "publisherId",
    fieldType: "string",
    operator: "is",
    value: "annonceur-1",
    combinator: "or",
    position: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

  const buildMission = (id: string, publisherId: string, startAt: string | null) => ({
    id,
    clientId: `client-${id}`,
    publisherId,
    title: id,
    startAt: startAt ? new Date(startAt) : null,
    addresses: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  const filters = { diffuseurPublisherId: "diffuseur-1", limit: 3, skip: 0 } as Parameters<typeof missionService.findMissions>[0];

  it("exécute une requête par scope et fusionne les résultats triés par startAt desc (NULLS FIRST)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "child-1", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    // Scope avec critères (annonceur-2) interrogé en premier, scope nu (annonceur-1) ensuite.
    prismaMock.mission.findMany.mockImplementation(({ where }: { where: unknown }) =>
      Promise.resolve(
        JSON.stringify(where).includes("annonceur-2")
          ? [buildMission("m2", "annonceur-2", "2026-04-01"), buildMission("m4", "annonceur-2", null)]
          : [buildMission("m1", "annonceur-1", "2026-05-01"), buildMission("m3", "annonceur-1", "2026-03-01")],
      ),
    );
    prismaMock.mission.count.mockImplementation(({ where }: { where: unknown }) => Promise.resolve(JSON.stringify(where).includes("annonceur-2") ? 2 : 5));

    const { data, total } = await missionService.findMissions(filters);

    expect(prismaMock.mission.findMany).toHaveBeenCalledTimes(2);
    for (const call of prismaMock.mission.findMany.mock.calls) {
      expect(call[0]).toMatchObject({ take: 3, orderBy: { startAt: "desc" } });
      expect(call[0].skip).toBeUndefined();
    }

    // NULLS FIRST en DESC : m4 (startAt null) d'abord, puis tri décroissant, coupé à limit=3.
    expect(data.map((mission) => mission.id)).toEqual(["m4", "m1", "m2"]);
    expect(total).toBe(7);
  });

  it("applique skip/limit après fusion (take = skip + limit par scope)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "child-1", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);
    prismaMock.mission.findMany.mockImplementation(({ where }: { where: unknown }) =>
      Promise.resolve(
        JSON.stringify(where).includes("annonceur-2")
          ? [buildMission("m2", "annonceur-2", "2026-04-01")]
          : [buildMission("m1", "annonceur-1", "2026-05-01"), buildMission("m3", "annonceur-1", "2026-03-01")],
      ),
    );
    prismaMock.mission.count.mockResolvedValue(0);

    const { data } = await missionService.findMissions({ ...filters, skip: 1, limit: 2 });

    for (const call of prismaMock.mission.findMany.mock.calls) {
      expect(call[0]).toMatchObject({ take: 3 });
    }
    expect(data.map((mission) => mission.id)).toEqual(["m2", "m3"]);
  });

  it("retombe sur le chemin standard avec un seul scope", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);
    prismaMock.mission.findMany.mockResolvedValue([]);
    prismaMock.mission.count.mockResolvedValue(0);

    await missionService.findMissions(filters);

    expect(prismaMock.mission.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.mission.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 3 });
  });

  it("retombe sur le chemin standard quand un annonceur apparaît dans plusieurs scopes", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-1", position: 1 }),
      buildRule({ id: "child-1", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);
    prismaMock.mission.findMany.mockResolvedValue([]);
    prismaMock.mission.count.mockResolvedValue(0);

    await missionService.findMissions(filters);

    expect(prismaMock.mission.findMany).toHaveBeenCalledTimes(1);
  });
});
