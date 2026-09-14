import { beforeEach, describe, expect, it, vi } from "vitest";

// Force la branche "production" du handler (stockage S3 + Import) plutôt que
// l'écriture du fichier local du mode développement. Le reste de @/config
// (PUBLISHER_IDS, etc.) est conservé tel quel.
vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return { ...actual, ENV: "test" };
});

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { TalentHandler } from "@/jobs/talent/handler";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { putObject } from "@/services/s3";
import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Talent job integration tests
 *
 * Talent est un *diffuseur* : le feed ne doit contenir que les missions JVA
 * matérialisées dans le snapshot `mission_diffusion` de Talent. Les exclusions
 * d'organisations configurées via PublisherDiffusionRule doivent donc écarter
 * les missions concernées du XML.
 *
 * - putObject (S3) est mocké globalement (tests/vitest/shared.ts).
 */

const TALENT_ID = PUBLISHER_IDS.TALENT;
const JVA_ID = PUBLISHER_IDS.JEVEUXAIDER;

// endAt par défaut de la factory = maintenant → la mission serait filtrée comme
// expirée par le handler. On force une date future pour les missions de test.
const FUTURE_END = new Date(Date.now() + 24 * 60 * 60 * 1000);

const handler = new TalentHandler();

/** Concatène tous les corps XML écrits sur S3 pendant le run. */
function getAllStoredXml(): string {
  return vi
    .mocked(putObject)
    .mock.calls.map(([, body]) => body as string)
    .join("");
}

beforeEach(async () => {
  vi.mocked(putObject).mockClear();
  await prisma.import.deleteMany({});
  await createTestPublisher({ id: TALENT_ID, name: "Talent" });
  await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });
});

describe("TalentHandler (integration test)", () => {
  it("exclut les missions JVA d'une organisation retirée de la diffusion Talent", async () => {
    // Scope JVA pour Talent + exclusion de l'organisation `excluded-org`.
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: TALENT_ID,
      annonceurPublisherId: JVA_ID,
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: "excluded-org",
    });

    const kept = await createTestMission({
      publisherId: JVA_ID,
      statusCode: "ACCEPTED",
      endAt: FUTURE_END,
      organizationName: "Orga gardée",
      organizationClientId: "kept-org",
    });
    const excluded = await createTestMission({
      publisherId: JVA_ID,
      statusCode: "ACCEPTED",
      endAt: FUTURE_END,
      organizationName: "Orga exclue",
      organizationClientId: "excluded-org",
    });

    // Matérialise le snapshot `mission_diffusion` de Talent à partir des règles.
    await missionDiffusionService.rebuildForDistributionPublisher(TALENT_ID);

    const result = await handler.handle({});

    expect(result.success).toBe(true);

    const xml = getAllStoredXml();
    // La mission de l'organisation gardée figure dans le feed…
    expect(xml).toContain(String(kept.id));
    // …celle de l'organisation exclue n'y figure pas.
    expect(xml).not.toContain(String(excluded.id));
  });
});
