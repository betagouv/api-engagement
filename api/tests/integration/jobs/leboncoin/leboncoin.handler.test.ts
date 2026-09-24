import { beforeEach, describe, expect, it, vi } from "vitest";

// Force la branche "production" du handler (stockage S3 + Import) plutôt que
// l'écriture des fichiers locaux du mode développement. Le reste de @/config
// (PUBLISHER_IDS, etc.) est conservé tel quel.
vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return { ...actual, ENV: "test" };
});

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { LeboncoinHandler } from "@/jobs/leboncoin/handler";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { putObject } from "@/services/s3";
import { PublisherMissionType } from "@/types/publisher";
import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Leboncoin job integration tests
 *
 * Leboncoin est un *diffuseur* : un flux XML par dispositif (Service Civique, SPV,
 * JeVeuxAider), chacun ciblant un publisher. Le périmètre de chaque flux vient du
 * snapshot `mission_diffusion` de LEBONCOIN (paramètre `diffuseurPublisherId` de
 * `buildWhere`), matérialisé après configuration des règles. Chaque flux est isolé :
 * une erreur sur l'un n'empêche pas les autres, et trace son propre Import.
 *
 * - putObject (S3) est mocké globalement (tests/vitest/shared.ts).
 */

const LEBONCOIN_ID = PUBLISHER_IDS.LEBONCOIN;
const JVA_ID = PUBLISHER_IDS.JEVEUXAIDER;
const SC_ID = PUBLISHER_IDS.SERVICE_CIVIQUE;

const SC_SLUG = "leboncoin-service-civique";
const SPV_SLUG = "leboncoin-spv";
const JVA_SLUG = "leboncoin-jeveuxaider";

// Adresse complète (code postal + ville) : requise pour que la mission soit localisable.
const LYON = [{ city: "Lyon", postalCode: "69001", departmentCode: "69", country: "France" } as any];
// departmentCode "13" → chef-lieu Marseille (13001), département Bouches-du-Rhône (SPV).
const BDR = [{ city: "Aix-en-Provence", postalCode: "13100", departmentCode: "13", country: "France" } as any];

const handler = new LeboncoinHandler();

/** Récupère le contenu XML stocké pour la clé "non datée" d'un flux. */
function getStoredXmlForSlug(slug: string): string | undefined {
  const call = vi.mocked(putObject).mock.calls.find(([key]) => key === `xml/${slug}.xml`);
  return call?.[1] as string | undefined;
}

/** Crée un publisher SPV (missionType volontariat_sapeurs_pompiers) diffusé à leboncoin. */
async function createSpvPublisher() {
  const publisher = await createTestPublisher({ name: "SDIS", missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS });
  await publisherDiffusionRuleService.findOrCreateScopeRoot(LEBONCOIN_ID, publisher.id);
  return publisher;
}

beforeEach(async () => {
  // mockReset (et pas seulement mockClear) : le test d'isolation remplace l'implémentation.
  vi.mocked(putObject)
    .mockReset()
    .mockResolvedValue({} as any);
  await prisma.import.deleteMany({});
  await createTestPublisher({ id: LEBONCOIN_ID, name: "Leboncoin" });
  await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });
  await createTestPublisher({ id: SC_ID, name: "Service Civique" });
});

describe("LeboncoinHandler (integration test)", () => {
  it("route chaque mission vers le flux de son dispositif et trace un Import par flux", async () => {
    const spvPublisher = await createSpvPublisher();
    await publisherDiffusionRuleService.findOrCreateScopeRoot(LEBONCOIN_ID, JVA_ID);
    await publisherDiffusionRuleService.findOrCreateScopeRoot(LEBONCOIN_ID, SC_ID);

    const scMission = await createTestMission({ publisherId: SC_ID, statusCode: "ACCEPTED", title: "Aider les aînés", addresses: LYON });
    const jvaMission = await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", title: "Maintenir un lien", addresses: LYON });
    const spvMission = await createTestMission({ publisherId: spvPublisher.id, statusCode: "ACCEPTED", title: "Pompier volontaire", addresses: BDR });

    await missionDiffusionService.rebuildForDistributionPublisher(LEBONCOIN_ID);

    const result = await handler.handle();
    expect(result.success).toBe(true);

    const scXml = getStoredXmlForSlug(SC_SLUG);
    const spvXml = getStoredXmlForSlug(SPV_SLUG);
    const jvaXml = getStoredXmlForSlug(JVA_SLUG);

    // Service Civique : titre préfixé, mission présente uniquement dans son flux.
    expect(scXml).toContain(scMission.id);
    expect(scXml).toContain("Service Civique - Aider les aînés");
    expect(scXml).not.toContain(jvaMission.id);
    expect(scXml).not.toContain(spvMission.id);

    // JeVeuxAider : 1 offre/mission.
    expect(jvaXml).toContain(jvaMission.id);
    expect(jvaXml).not.toContain(scMission.id);

    // SPV : localisée au chef-lieu du département, titre départemental.
    expect(spvXml).toContain(spvMission.id);
    expect(spvXml).toContain("Volontariat Sapeur-Pompier - Bouches-du-Rhône");
    expect(spvXml).toContain("Marseille");
    expect(spvXml).toContain("13001");

    // Un Import SUCCESS par flux.
    const imports = await prisma.import.findMany({ where: { publisherId: LEBONCOIN_ID } });
    expect(imports).toHaveLength(3);
    expect(imports.every((imp) => imp.status === "SUCCESS")).toBe(true);
    expect(imports.map((imp) => imp.name).sort()).toEqual(["LEBONCOIN_JEVEUXAIDER", "LEBONCOIN_SERVICE_CIVIQUE", "LEBONCOIN_SPV"]);
  });

  it("n'inclut que les missions matérialisées dans le snapshot (exclusion d'organisation)", async () => {
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: LEBONCOIN_ID,
      annonceurPublisherId: JVA_ID,
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: "excluded-org",
    });

    const kept = await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", organizationClientId: "kept-org", addresses: LYON });
    const excluded = await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", organizationClientId: "excluded-org", addresses: LYON });

    await missionDiffusionService.rebuildForDistributionPublisher(LEBONCOIN_ID);

    const result = await handler.handle();
    expect(result.success).toBe(true);

    const jvaXml = getStoredXmlForSlug(JVA_SLUG);
    expect(jvaXml).toContain(kept.id);
    expect(jvaXml).not.toContain(excluded.id);
  });

  it("exclut du flux Service Civique une mission sans code postal (filtre au niveau requête)", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(LEBONCOIN_ID, SC_ID);

    const located = await createTestMission({ publisherId: SC_ID, statusCode: "ACCEPTED", addresses: LYON });
    const noPostalCode = await createTestMission({
      publisherId: SC_ID,
      statusCode: "ACCEPTED",
      remote: "no",
      addresses: [{ city: "Nulle-part", postalCode: null, departmentCode: null } as any],
    });

    await missionDiffusionService.rebuildForDistributionPublisher(LEBONCOIN_ID);

    const result = await handler.handle();
    expect(result.success).toBe(true);

    const scXml = getStoredXmlForSlug(SC_SLUG);
    expect(scXml).toContain(located.id);
    expect(scXml).not.toContain(noPostalCode.id);
  });

  it("isole un flux en échec : les autres flux aboutissent quand même", async () => {
    const spvPublisher = await createSpvPublisher();
    await publisherDiffusionRuleService.findOrCreateScopeRoot(LEBONCOIN_ID, JVA_ID);
    await publisherDiffusionRuleService.findOrCreateScopeRoot(LEBONCOIN_ID, SC_ID);

    await createTestMission({ publisherId: SC_ID, statusCode: "ACCEPTED", addresses: LYON });
    await createTestMission({ publisherId: JVA_ID, statusCode: "ACCEPTED", addresses: LYON });
    await createTestMission({ publisherId: spvPublisher.id, statusCode: "ACCEPTED", addresses: BDR });

    await missionDiffusionService.rebuildForDistributionPublisher(LEBONCOIN_ID);

    // Le stockage du seul flux SPV échoue.
    vi.mocked(putObject).mockImplementation((key: string) => (key.includes(SPV_SLUG) ? Promise.reject(new Error("boom")) : (Promise.resolve({}) as any)));

    const result = await handler.handle();

    // Le run global est en échec, mais SC et JVA ont abouti.
    expect(result.success).toBe(false);
    expect(result.spv?.ok).toBe(false);
    expect(result.serviceCivique?.ok).toBe(true);
    expect(result.jva?.ok).toBe(true);

    const imports = await prisma.import.findMany({ where: { publisherId: LEBONCOIN_ID } });
    const byName = Object.fromEntries(imports.map((imp) => [imp.name, imp.status]));
    expect(byName["LEBONCOIN_SPV"]).toBe("FAILED");
    expect(byName["LEBONCOIN_SERVICE_CIVIQUE"]).toBe("SUCCESS");
    expect(byName["LEBONCOIN_JEVEUXAIDER"]).toBe("SUCCESS");
  });
});
