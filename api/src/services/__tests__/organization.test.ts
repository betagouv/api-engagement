import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaCore } from "@/db/postgres";
import { organizationService } from "@/services/organization";

const organizationCrud = (prismaCore as any).organization as {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

describe("organizationService searchText maintenance", () => {
  beforeEach(() => {
    organizationCrud.findUnique.mockReset();
    organizationCrud.update.mockReset();
    organizationCrud.upsert.mockReset();
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
});
