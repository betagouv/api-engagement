import { XMLParser, XMLValidator } from "fast-xml-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Force la branche "production" du handler (stockage S3 + Import) plutôt que l'écriture locale du mode développement.
vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return { ...actual, ENV: "test" };
});

import { API_URL, PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { DOMAIN_SECTOR } from "@/jobs/hellowork/config";
import { HelloworkHandler } from "@/jobs/hellowork/handler";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { putObject } from "@/services/s3";
import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Hellowork job integration tests
 *
 * Hellowork et Jobijoba sont des *diffuseurs* : un flux XML par publisherId (paramètre du job), dont le
 * périmètre vient uniquement de leur snapshot `mission_diffusion`. Le code ne restreint pas les publishers. putObject (S3) est mocké globalement (tests/vitest/shared.ts).
 */

const HELLOWORK_ID = PUBLISHER_IDS.HELLOWORK;
const JVA_ID = PUBLISHER_IDS.JEVEUXAIDER;
const SC_ID = PUBLISHER_IDS.SERVICE_CIVIQUE;

const LYON = [{ city: "Lyon", postalCode: "69001", departmentCode: "69", country: "France" } as any];

// La factory fixe endAt à "maintenant" : on le repousse pour que la mission ne soit pas ignorée comme expirée.
const NEXT_YEAR = new Date(Date.now() + 365 * 24 * 3600 * 1000);

const handler = new HelloworkHandler();

function getStoredXml(publisherId = HELLOWORK_ID): string | undefined {
  return vi.mocked(putObject).mock.calls.find(([key]) => key === `xml/hellowork-${publisherId}.xml`)?.[1] as string | undefined;
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
  it("publie uniquement les missions du snapshot du diffuseur", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, SC_ID);

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

    const result = await handler.handle({ publisherId: HELLOWORK_ID });
    expect(result.success).toBe(true);
    expect(result.counter).toEqual({ processed: 1, sent: 1, skipped: 0 });

    const xml = getStoredXml();
    expect(xml).toContain(sc.id);
    expect(xml).toContain("Service Civique - Aider les aînés");
    expect(xml).toContain("Stage");
    expect(xml).not.toContain(jva.id);

    const imports = await prisma.import.findMany({ where: { publisherId: HELLOWORK_ID } });
    expect(imports).toHaveLength(1);
    expect(imports[0]).toMatchObject({ name: "HELLOWORK", status: "SUCCESS", createdCount: 1 });
  });

  it("génère un flux distinct par diffuseur, sans préfixe Service Civique hors SC", async () => {
    const JOBIJOBA_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
    await createTestPublisher({ id: JOBIJOBA_ID, name: "Jobijoba" });
    await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, SC_ID);
    await publisherDiffusionRuleService.findOrCreateScopeRoot(JOBIJOBA_ID, JVA_ID);
    const sc = await createTestMission({ publisherId: SC_ID, statusCode: "ACCEPTED", organizationName: "Une association", endAt: NEXT_YEAR, title: "Aider", addresses: LYON });
    const jva = await createTestMission({
      publisherId: JVA_ID,
      statusCode: "ACCEPTED",
      organizationName: "Une association",
      endAt: NEXT_YEAR,
      title: "Maintenir un lien",
      addresses: LYON,
    });
    await missionDiffusionService.rebuildForDistributionPublisher(HELLOWORK_ID);
    await missionDiffusionService.rebuildForDistributionPublisher(JOBIJOBA_ID);

    expect((await handler.handle({ publisherId: HELLOWORK_ID })).success).toBe(true);
    expect((await handler.handle({ publisherId: JOBIJOBA_ID })).success).toBe(true);

    const hw = getStoredXml(HELLOWORK_ID)!;
    expect(hw).toContain(sc.id);
    expect(hw).not.toContain(jva.id);
    const jj = getStoredXml(JOBIJOBA_ID)!;
    expect(jj).toContain(jva.id);
    expect(jj).not.toContain(sc.id);
    expect(jj).toContain("Maintenir un lien");
    expect(jj).not.toContain("Service Civique -");
    expect(jj).toContain(`/r/${jva.id}/${JOBIJOBA_ID}`);
    expect(await prisma.import.count({ where: { publisherId: JOBIJOBA_ID, status: "SUCCESS" } })).toBe(1);
  });

  it("refuse un lancement sans publisherId", async () => {
    expect((await handler.handle({} as any)).success).toBe(false);
    expect(putObject).not.toHaveBeenCalled();
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

    expect((await handler.handle({ publisherId: HELLOWORK_ID })).success).toBe(true);

    const xml = getStoredXml();
    expect(xml).toContain(kept.id);
    expect(xml).not.toContain(excluded.id);
  });

  it("n'écrit rien sur S3 et trace un Import FAILED si la génération échoue", async () => {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, SC_ID);
    await createTestMission({ publisherId: SC_ID, statusCode: "ACCEPTED", organizationName: "Une association", endAt: NEXT_YEAR, addresses: LYON });
    await missionDiffusionService.rebuildForDistributionPublisher(HELLOWORK_ID);
    vi.mocked(putObject).mockRejectedValueOnce(new Error("S3 indisponible"));

    const result = await handler.handle({ publisherId: HELLOWORK_ID });
    expect(result.success).toBe(false);

    const imports = await prisma.import.findMany({ where: { publisherId: HELLOWORK_ID } });
    expect(imports).toHaveLength(1);
    expect(imports[0].status).toBe("FAILED");
  });
});

/**
 * Validation du XML produit contre le format décrit dans « Flux RJ Spec » (Hellowork) :
 * flux bien formé, champs obligatoires, valeurs du référentiel, HTML restreint, formats de dates.
 * Hellowork ne valide pas contre un XSD : on contrôle donc la structure attendue directement.
 */
describe("HelloworkHandler — conformité du XML", () => {
  // Référentiel « Secteur » (§ 3.2 du PDF), libellés exacts.
  const SECTORS = [
    "Industrie Agro-alimentaire",
    "Service public d'état",
    "BTP",
    "Distribution/Commerce de gros",
    "Industrie high-tech/Telecom",
    "Média/Internet/Communication",
    "Restauration",
    "Banque/Assurance/Finance",
    "Industrie Auto/Meca/Navale",
    "Santé/Social/Association",
    "Secteur Energie/Environnement",
    "Services aux Personnes/Particuliers",
    "Tourisme/Hôtellerie/Loisirs",
    "Industrie Pharmaceutique/Biotechn./Chimie",
    "Industrie Pétrolière/Pétrochimie",
    "Industrie Manufacturière",
    "Industrie Aéronautique/Aérospatial",
    "Enseignement/Formation",
    "Transport/Logistique",
    "Immobilier",
    "Agriculture/Pêche",
    "Services aux Entreprises",
    "Secteur informatique/ESN",
    "Service public hospitalier",
    "Service public autres",
    "Service public des collectivités territoriales",
  ];
  const CONTRACTS = ["CDI", "CDD", "Stage", "Travail temporaire", "Franchise", "Indépendant", "Alternance"];
  const HTML_FIELDS = ["DescriptionEntreprise", "DescriptionPoste", "Profil"];
  const ALLOWED_TAGS = ["b", "i", "br", "p", "ul", "ol", "li"];

  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });

  // Titre piégeux : esperluette, chevrons, guillemets et séquence de fermeture de CDATA.
  const TRICKY_TITLE = 'Aider & "protéger" <les> aînés ]]> fin';

  async function publishFeed() {
    await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, SC_ID);
    const common = { publisherId: SC_ID, statusCode: "ACCEPTED" as const, organizationName: "Une association", endAt: NEXT_YEAR, addresses: LYON };
    await createTestMission({
      ...common,
      title: TRICKY_TITLE,
      description: "Ligne 1\n\nLigne 2 & suite",
      descriptionHtml: "<p>Ligne 1</p><h2>Titre</h2><p>Ligne 2 &amp; <a href='https://x.fr'>suite</a></p>",
      domain: "education",
      compensationAmount: 620,
      compensationUnit: "month",
    });
    await createTestMission({ ...common, title: "Service civique - Mission à distance", remote: "full", addresses: [], domain: "inconnu" });
    await missionDiffusionService.rebuildForDistributionPublisher(HELLOWORK_ID);

    expect((await handler.handle({ publisherId: HELLOWORK_ID })).success).toBe(true);
    const xml = getStoredXml()!;
    expect(xml).toBeDefined();
    return xml;
  }

  const offersOf = (xml: string): Record<string, any>[] => {
    const parsed = parser.parse(xml).root.offre;
    return Array.isArray(parsed) ? parsed : [parsed];
  };

  it("produit un XML bien formé, en UTF-8, avec <root> et une <offre> par mission", async () => {
    const xml = await publishFeed();

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(offersOf(xml)).toHaveLength(2);
  });

  it("renseigne les champs obligatoires de chaque offre", async () => {
    const offers = offersOf(await publishFeed());

    for (const offer of offers) {
      expect(offer.Nom_Ese).toBe("Une association");
      expect(offer.Reference).toBeTruthy();
      expect(offer.ExternalId).toBe(offer.Reference);
      expect(offer.Poste).toMatch(/^Service Civique - |^Service civique - /);
      expect(offer.Ville).toBeTruthy();
      expect(offer.Criteres.CritereContrat).toBe("Stage");
      // Une offre doit avoir Email ou Url_Reponse ; ici l'URL de candidature trackée (https en production, cf. API_URL).
      expect(offer.Url_Reponse).toBe(`${API_URL}/r/${offer.Reference}/${HELLOWORK_ID}`);
      expect(offer.Aveugle).toBe("0");
    }
  });

  it("n'utilise que des valeurs du référentiel Hellowork pour secteur, contrat et télétravail", async () => {
    const offers = offersOf(await publishFeed());

    for (const offer of offers) {
      expect(SECTORS).toContain(offer.Criteres.CritereSecteur);
      expect(CONTRACTS).toContain(offer.Criteres.CritereContrat);
      expect(["Complet", "Partiel", "Non"]).toContain(offer.Criteres.Teletravail);
    }
    // Garde-fou sur toute la table de mapping, pas seulement sur les missions de ce test.
    expect(Object.values(DOMAIN_SECTOR).every((sector) => SECTORS.includes(sector))).toBe(true);
  });

  it("n'émet dans les champs texte que les balises HTML gérées par Hellowork", async () => {
    const offers = offersOf(await publishFeed());

    for (const offer of offers) {
      for (const field of HTML_FIELDS.filter((name) => offer[name])) {
        const tags = [...String(offer[field]).matchAll(/<\/?([a-z0-9]+)/gi)].map((match) => match[1].toLowerCase());
        expect(
          tags.filter((tag) => !ALLOWED_TAGS.includes(tag)),
          `${field} : balises non gérées`
        ).toEqual([]);
      }
      expect(offer.DescriptionPoste).toBeTruthy();
      expect(offer.Profil).toContain("Pour postuler à un Service Civique");
    }
  });

  it("formate les dates en dd/MM/yyyy HH:mm:ss et les adresses selon le modèle", async () => {
    const offers = offersOf(await publishFeed());
    const lyon = offers.find((offer) => offer.Ville === "Lyon")!;

    expect(lyon.DateAnnonce).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(lyon.DateModification).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(lyon.AdressesPostales.AdressePostale).toMatchObject({ CodePostal: "69001", Ville: "Lyon", Pays: "France" });
    // Mission à distance sans adresse : repli Paris 75001.
    const remote = offers.find((offer) => offer.Ville === "Paris")!;
    expect(remote.AdressesPostales.AdressePostale).toMatchObject({ CodePostal: "75001", Pays: "France" });
    expect(remote.Criteres.Teletravail).toBe("Complet");
  });

  it("porte la rémunération en attributs de NiveauSalaire, uniquement quand elle existe", async () => {
    const offers = offersOf(await publishFeed());
    const paid = offers.find((offer) => offer.Ville === "Lyon")!;
    const unpaid = offers.find((offer) => offer.Ville === "Paris")!;

    expect(paid.NiveauSalaire).toMatchObject({ "@_Devise": "EUR", "@_Periodicite": "MONTH", "@_Affichable": "true", SalaireMin: "620" });
    expect(unpaid.NiveauSalaire).toBeUndefined();
  });

  it("préserve les caractères spéciaux du titre (CDATA) sans casser le XML", async () => {
    const offers = offersOf(await publishFeed());

    expect(offers.map((offer) => offer.Poste)).toContain(`Service Civique - ${TRICKY_TITLE}`);
  });
});
