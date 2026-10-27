import { beforeEach, describe, expect, it, vi } from "vitest";

// Force la branche "production" du handler (stockage S3 + Import) plutôt que l'écriture locale du mode développement.
vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return { ...actual, ENV: "test" };
});

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { HelloworkHandler } from "@/jobs/hellowork/handler";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { putObject } from "@/services/s3";
import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Hellowork job integration tests
 *
 * Hellowork est un *diffuseur* : un seul flux XML, dont le périmètre vient uniquement du snapshot
 * `mission_diffusion` de HELLOWORK. Le code ne restreint pas les publishers : il formate le Service
 * Civique et ignore les autres dispositifs. putObject (S3) est mocké globalement (tests/vitest/shared.ts).
 */

const HELLOWORK_ID = PUBLISHER_IDS.HELLOWORK;
const JVA_ID = PUBLISHER_IDS.JEVEUXAIDER;
const SC_ID = PUBLISHER_IDS.SERVICE_CIVIQUE;

const LYON = [{ city: "Lyon", postalCode: "69001", departmentCode: "69", country: "France" } as any];

// La factory fixe endAt à "maintenant" : on le repousse pour que la mission ne soit pas ignorée comme expirée.
const NEXT_YEAR = new Date(Date.now() + 365 * 24 * 3600 * 1000);

const handler = new HelloworkHandler();

function getStoredXml(): string | undefined {
  return vi.mocked(putObject).mock.calls.find(([key]) => key === "xml/hellowork.xml")?.[1] as string | undefined;
}

beforeEach(async () => {
  vi.mocked(putObject)
    .mockReset()
    .mockResolvedValue({} as any);
  await prisma.import.deleteMany({});
  await createTestPublisher({ id: HELLOWORK_ID, name: "Hellowork" });
  await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });
  await createTestPublisher({ id: SC_ID, name: "Service Civique" });
});

describe("HelloworkHandler (integration test)", () => {
  it("publie les missions Service Civique du snapshot et ignore les autres dispositifs", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, SC_ID);
    await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, JVA_ID);

    const sc = await createTestMission({
      publisherId: SC_ID,
      statusCode: "ACCEPTED",
      organizationName: "Une association",
      endAt: NEXT_YEAR,
      title: "Aider les aînés",
      addresses: LYON,
    });
    const jva = await createTestMission({
      publisherId: JVA_ID,
      statusCode: "ACCEPTED",
      organizationName: "Une association",
      endAt: NEXT_YEAR,
      title: "Maintenir un lien",
      addresses: LYON,
    });
    await missionDiffusionService.rebuildForDistributionPublisher(HELLOWORK_ID);

    const result = await handler.handle();
    expect(result.success).toBe(true);
    expect(result.counter).toEqual({ processed: 2, sent: 1, skipped: 1 });

    const xml = getStoredXml();
    expect(xml).toContain(sc.id);
    expect(xml).toContain("Service Civique - Aider les aînés");
    expect(xml).toContain("Stage");
    expect(xml).not.toContain(jva.id);

    const imports = await prisma.import.findMany({ where: { publisherId: HELLOWORK_ID } });
    expect(imports).toHaveLength(1);
    expect(imports[0]).toMatchObject({ name: "HELLOWORK", status: "SUCCESS", createdCount: 1 });
  });

  it("n'inclut que les missions matérialisées dans le snapshot (exclusion d'organisation)", async () => {
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: HELLOWORK_ID,
      annonceurPublisherId: SC_ID,
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: "excluded-org",
    });

    const kept = await createTestMission({
      publisherId: SC_ID,
      statusCode: "ACCEPTED",
      organizationName: "Une association",
      endAt: NEXT_YEAR,
      organizationClientId: "kept-org",
      addresses: LYON,
    });
    const excluded = await createTestMission({
      publisherId: SC_ID,
      statusCode: "ACCEPTED",
      organizationName: "Une association",
      organizationClientId: "excluded-org",
      addresses: LYON,
    });
    await missionDiffusionService.rebuildForDistributionPublisher(HELLOWORK_ID);

    expect((await handler.handle()).success).toBe(true);

    const xml = getStoredXml();
    expect(xml).toContain(kept.id);
    expect(xml).not.toContain(excluded.id);
  });

  it("n'écrit rien sur S3 et trace un Import FAILED si la génération échoue", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, SC_ID);
    await createTestMission({ publisherId: SC_ID, statusCode: "ACCEPTED", organizationName: "Une association", endAt: NEXT_YEAR, addresses: LYON });
    await missionDiffusionService.rebuildForDistributionPublisher(HELLOWORK_ID);
    vi.mocked(putObject).mockRejectedValueOnce(new Error("S3 indisponible"));

    const result = await handler.handle();
    expect(result.success).toBe(false);

    const imports = await prisma.import.findMany({ where: { publisherId: HELLOWORK_ID } });
    expect(imports).toHaveLength(1);
    expect(imports[0].status).toBe("FAILED");
  });
});
