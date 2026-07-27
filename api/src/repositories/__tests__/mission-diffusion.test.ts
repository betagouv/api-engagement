import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";

const prismaMock = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
};

const getSqlText = (query: unknown): string => {
  if (typeof query === "object" && query !== null && "strings" in query && Array.isArray(query.strings)) {
    return query.strings.join("");
  }
  return "";
};

describe("missionDiffusionRepository.findDistributionPublisherIdsForMission", () => {
  beforeEach(() => {
    prismaMock.$queryRaw.mockReset();
  });

  it("ne requête pas PostgreSQL sans scope candidat", async () => {
    await expect(missionDiffusionRepository.findDistributionPublisherIdsForMission("mission-1", [])).resolves.toEqual([]);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("compile tous les scopes avec le compilateur SQL existant", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { distributionPublisherId: "diffuseur-1" },
      { distributionPublisherId: "diffuseur-1" },
    ]);

    const result = await missionDiffusionRepository.findDistributionPublisherIdsForMission("mission-1", [
      {
        distributionPublisherId: "diffuseur-1",
        rules: [
          { field: "publisherId", fieldType: "string", operator: "is", value: "annonceur-1", combinator: "or" },
          {
            field: "publisherOrganization.parentOrganizations",
            fieldType: "string",
            operator: "does_not_contain",
            value: "network-1",
            combinator: "or",
          },
        ],
      },
      {
        distributionPublisherId: "diffuseur-2",
        rules: [{ field: "publisherId", fieldType: "string", operator: "is", value: "annonceur-1", combinator: "or" }],
      },
    ]);

    const sql = getSqlText(prismaMock.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain('FROM "mission" m');
    expect(sql).toContain("UNION ALL");
    expect(sql).toContain("unnest");
    expect(result).toEqual(["diffuseur-1"]);
  });
});
