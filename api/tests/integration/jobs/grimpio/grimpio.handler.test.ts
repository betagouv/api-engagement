import { beforeEach, describe, expect, it, vi } from "vitest";

// Force la branche "production" du handler (stockage S3 + Import) plutôt que
// l'écriture de fichiers locaux du mode développement. Le reste de @/config
// (PUBLISHER_IDS, etc.) est conservé tel quel.
vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return { ...actual, ENV: "test" };
});

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { GrimpioHandler } from "@/jobs/grimpio/handler";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { putObject } from "@/services/s3";
import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Grimpio job integration tests
 *
 * Grimpio est un *diffuseur* : ses annonceurs (JVA, ASC) sont configurés en DB
 * via des PublisherDiffusionRule (rule racine field=publisherId). Le handler
 * récupère les missions candidates via ces règles, puis génère un feed XML par
 * publisher.
 *
 * - putObject (S3) est mocké globalement (tests/vitest/shared.ts).
 */

const GRIMPIO_ID = PUBLISHER_IDS.GRIMPIO;
const JVA_ID = PUBLISHER_IDS.JEVEUXAIDER;
const ASC_ID = PUBLISHER_IDS.SERVICE_CIVIQUE;

// endAt par défaut de la factory = maintenant → la mission serait filtrée comme
// expirée par le handler. On force une date future pour les missions de test.
const FUTURE_END = new Date(Date.now() + 24 * 60 * 60 * 1000);
const PAST_END = new Date(Date.now() - 24 * 60 * 60 * 1000);

const handler = new GrimpioHandler();

/** Récupère le contenu XML stocké pour la clé "non datée" d'un publisher. */
function getStoredXmlForPublisher(publisherId: string): string | undefined {
  const calls = vi.mocked(putObject).mock.calls;
  const call = calls.find(([key]) => key === `xml/grimpio-${publisherId}.xml`);
  return call?.[1] as string | undefined;
}

beforeEach(async () => {
  vi.mocked(putObject).mockClear();
  await prisma.import.deleteMany({});
});

describe("GrimpioHandler (integration test)", () => {
  it("n'inclut pas la mission d'un publisher hors annonceurs de grimpio", async () => {
    await createTestPublisher({ id: GRIMPIO_ID, name: "Grimpio" });
    await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });
    await createTestPublisher({ id: ASC_ID, name: "Service Civique" });
    const otherPublisher = await createTestPublisher({ name: "Autre publisher" });

    // Annonceurs configurés en DB pour grimpio : JVA + ASC (pas "otherPublisher")
    await publisherDiffusionRuleService.findOrCreateScopeRoot(GRIMPIO_ID, JVA_ID);
    await publisherDiffusionRuleService.findOrCreateScopeRoot(GRIMPIO_ID, ASC_ID);

    await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "jva-mission-1", title: "Mission JVA" });
    await createTestMission({ publisherId: ASC_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "asc-mission-1", title: "Mission ASC" });
    await createTestMission({ publisherId: otherPublisher.id, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "other-mission-1", title: "Mission Autre" });

    const result = await handler.handle({});

    expect(result.success).toBe(true);

    const jvaXml = getStoredXmlForPublisher(JVA_ID);
    const ascXml = getStoredXmlForPublisher(ASC_ID);
    expect(jvaXml).toBeDefined();
    expect(ascXml).toBeDefined();

    // La mission du publisher non-annonceur n'apparaît dans aucun feed.
    const allXml = vi
      .mocked(putObject)
      .mock.calls.map(([, body]) => body as string)
      .join("");
    expect(allXml).not.toContain("other-mission-1");

    // Chaque mission d'annonceur figure dans le feed de son publisher.
    expect(jvaXml).toContain("jva-mission-1");
    expect(ascXml).toContain("asc-mission-1");

    // Aucun feed n'est généré pour le publisher non-annonceur.
    expect(result.feeds?.some((feed) => feed.publisherId === otherPublisher.id)).toBe(false);
  });

  it("génère un feed (et un Import) par publisher annonceur", async () => {
    await createTestPublisher({ id: GRIMPIO_ID, name: "Grimpio" });
    await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });
    await createTestPublisher({ id: ASC_ID, name: "Service Civique" });

    await publisherDiffusionRuleService.findOrCreateScopeRoot(GRIMPIO_ID, JVA_ID);
    await publisherDiffusionRuleService.findOrCreateScopeRoot(GRIMPIO_ID, ASC_ID);

    await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "jva-mission-1" });
    await createTestMission({ publisherId: ASC_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "asc-mission-1" });

    const result = await handler.handle({});

    expect(result.success).toBe(true);

    // Un feed par publisher annonceur.
    const feedPublisherIds = (result.feeds ?? []).map((feed) => feed.publisherId).sort();
    expect(feedPublisherIds).toEqual([JVA_ID, ASC_ID].sort());

    // S3 : la clé "non datée" et la clé datée sont écrites pour chaque publisher.
    const storedKeys = vi.mocked(putObject).mock.calls.map(([key]) => key);
    expect(storedKeys).toContain(`xml/grimpio-${JVA_ID}.xml`);
    expect(storedKeys).toContain(`xml/grimpio-${ASC_ID}.xml`);
    expect(storedKeys.filter((key) => key.startsWith(`xml/grimpio-${JVA_ID}`))).toHaveLength(2);
    expect(storedKeys.filter((key) => key.startsWith(`xml/grimpio-${ASC_ID}`))).toHaveLength(2);

    // Un Import par publisher.
    const imports = await prisma.import.findMany({ where: { publisherId: GRIMPIO_ID } });
    expect(imports).toHaveLength(2);
    expect(imports.map((imp) => imp.name).sort()).toEqual([`GRIMPIO-${JVA_ID}`, `GRIMPIO-${ASC_ID}`].sort());
  });

  it("réécrit un feed vide quand un publisher annonceur n'a aucune mission active", async () => {
    await createTestPublisher({ id: GRIMPIO_ID, name: "Grimpio" });
    await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });
    await createTestPublisher({ id: ASC_ID, name: "Service Civique" });

    await publisherDiffusionRuleService.findOrCreateScopeRoot(GRIMPIO_ID, JVA_ID);
    await publisherDiffusionRuleService.findOrCreateScopeRoot(GRIMPIO_ID, ASC_ID);

    await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "jva-active" });
    await createTestMission({ publisherId: ASC_ID, statusCode: "ACCEPTED", endAt: PAST_END, clientId: "asc-expired" });

    const result = await handler.handle({});

    expect(result.success).toBe(true);
    expect(result.feeds?.find((feed) => feed.publisherId === ASC_ID)?.sent).toBe(0);
    expect(result.counter).toMatchObject({ sent: 1, expired: 1 });

    const ascXml = getStoredXmlForPublisher(ASC_ID);
    expect(ascXml).toBeDefined();
    expect(ascXml).not.toContain("asc-expired");

    const storedKeys = vi.mocked(putObject).mock.calls.map(([key]) => key);
    expect(storedKeys).toContain(`xml/grimpio-${ASC_ID}.xml`);
  });

  it("applique les critères enfants d'une rule (exclusion d'une organisation)", async () => {
    await createTestPublisher({ id: GRIMPIO_ID, name: "Grimpio" });
    await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });

    // Scope JVA + exclusion de l'organisation `excluded-org`.
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: GRIMPIO_ID,
      annonceurPublisherId: JVA_ID,
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: "excluded-org",
    });

    await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "jva-kept", organizationClientId: "kept-org" });
    await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "jva-excluded", organizationClientId: "excluded-org" });

    const result = await handler.handle({});

    expect(result.success).toBe(true);

    const jvaXml = getStoredXmlForPublisher(JVA_ID);
    expect(jvaXml).toBeDefined();
    expect(jvaXml).toContain("jva-kept");
    expect(jvaXml).not.toContain("jva-excluded");
  });

  it("ne génère aucun feed quand grimpio n'a aucune diffusion rule", async () => {
    await createTestPublisher({ id: GRIMPIO_ID, name: "Grimpio" });
    await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });

    // Aucune rule configurée pour grimpio.
    await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", endAt: FUTURE_END, clientId: "jva-mission-1" });

    const result = await handler.handle({});

    expect(result.success).toBe(true);
    expect(result.feeds).toEqual([]);
    expect(vi.mocked(putObject)).not.toHaveBeenCalled();
  });
});
