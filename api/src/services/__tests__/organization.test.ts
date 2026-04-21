import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { organizationRepository } from "@/repositories/organization";
import { organizationService } from "@/services/organization";

const organizationCrud = (prisma as any).organization as {
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

describe("organizationService searchText maintenance", () => {
  beforeEach(() => {
    organizationCrud.findUnique.mockReset();
    organizationCrud.findMany.mockReset();
    organizationCrud.count.mockReset();
    organizationCrud.update.mockReset();
    organizationCrud.upsert.mockReset();
    vi.restoreAllMocks();
  });

  it("recomputes searchText on updateOrganization when an identifier changes", async () => {
    organizationCrud.findUnique.mockResolvedValue({
      title: "Croix Rouge",
      shortTitle: "CR",
      rna: "W111111111",
      siret: "12345678901234",
      siren: "123456789",
    });
    organizationCrud.update.mockResolvedValue({ id: "org-1" });

    await organizationService.updateOrganization("org-1", { rna: "W222222222" });

    expect(organizationCrud.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: {
        rna: "W222222222",
        searchText: "croix rouge cr w222222222 12345678901234 123456789",
      },
    });
  });

  it("sets searchText in bulkUpsertByRna for create and update payloads", async () => {
    organizationCrud.upsert.mockResolvedValue({ id: "org-1" });

    await organizationService.bulkUpsertByRna(
      [
        {
          rna: "W123456789",
          title: "Croix Rouge",
          shortTitle: " CR ",
          siret: "12345678901234",
          siren: "123456789",
        },
      ],
      { chunkSize: 1 }
    );

    expect(organizationCrud.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          searchText: "croix rouge cr w123456789 12345678901234 123456789",
        }),
        update: expect.objectContaining({
          searchText: "croix rouge cr w123456789 12345678901234 123456789",
        }),
      })
    );
  });

  it("normalizes accented queries for generic organization search", async () => {
    organizationCrud.count.mockResolvedValue(0);
    organizationCrud.findMany.mockResolvedValue([]);

    await organizationService.findOrganizationsByFilters({ query: "Association des étudiants" });

    expect(organizationCrud.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                {
                  searchText: { contains: "association des etudiants" },
                },
              ],
            },
          ],
        },
      })
    );
  });

  it("routes a SIREN query to the exact-match v0 search path", async () => {
    const spy = vi.spyOn(organizationRepository, "findManyForV0Search").mockResolvedValue([]);

    await organizationService.findOrganizationsForV0({ query: "123456789" });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        querySiren: "123456789",
        queryTs: null,
        queryText: null,
      })
    );
  });

  it("routes a long text query to the full-text v0 search path", async () => {
    const spy = vi.spyOn(organizationRepository, "findManyForV0Search").mockResolvedValue([]);

    await organizationService.findOrganizationsForV0({ query: "Association des étudiants" });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryText: "association des etudiants",
        queryTs: "association:* & des:* & etudiants:*",
      })
    );
  });

  it("keeps the LIKE fallback for short queries on the v0 search path", async () => {
    const spy = vi.spyOn(organizationRepository, "findManyForV0Search").mockResolvedValue([]);

    await organizationService.findOrganizationsForV0({ query: "as" });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryText: "as",
        queryTs: null,
      })
    );
  });
});
