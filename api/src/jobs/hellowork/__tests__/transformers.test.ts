import { describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { missionToOffer } from "@/jobs/hellowork/transformers";
import { buildScTitle, formatDate, generateXML, textToHtml } from "@/jobs/hellowork/utils";
import { MissionRecord } from "@/types/mission";

vi.mock("../../../utils/mission", () => ({
  getMissionTrackedApplicationUrl: vi.fn((mission, publisherId) => `https://api/r/${mission.id}/${publisherId}`),
}));

const scMission: Partial<MissionRecord> = {
  id: "uuid-sc-1",
  publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE,
  publisherName: "Service Civique",
  title: "Aider les personnes âgées",
  description: "Première ligne.\n\nDeuxième & fin.",
  descriptionHtml: null,
  domain: "education",
  remote: "no",
  organizationName: "Une association",
  organizationDescription: "Qui aide.",
  requirements: ["Être motivé"],
  createdAt: new Date("2026-10-23T10:33:46Z"),
  updatedAt: new Date("2026-10-25T07:02:11Z"),
  postedAt: null,
  startAt: null,
  endAt: null,
  compensationAmount: null,
  addresses: [{ city: "Lyon", postalCode: "69001", street: "1 rue X", country: "France", departmentName: "Rhône", region: "ARA", location: { lat: 45.7, lon: 4.8 } } as any],
};

describe("missionToOffer — Service Civique", () => {
  it("mappe une mission SC valide", () => {
    const offer = missionToOffer(scMission as MissionRecord, PUBLISHER_IDS.HELLOWORK)!;
    expect(offer.Nom_Ese).toBe("Une association");
    expect(offer.Agence).toBe("Service Civique");
    expect(offer.Poste).toBe("Service Civique - Aider les personnes âgées");
    expect(offer.Reference).toBe("uuid-sc-1");
    expect(offer.ExternalId).toBe("uuid-sc-1");
    expect(offer.Url_Reponse).toBe(`https://api/r/uuid-sc-1/${PUBLISHER_IDS.HELLOWORK}`);
    expect(offer.Ville).toBe("Lyon");
    expect(offer.AdressesPostales.AdressePostale).toEqual([
      { Voie: "1 rue X", CodePostal: "69001", Ville: "Lyon", Departement: "Rhône", Region: "ARA", Pays: "France", Latitude: 45.7, Longitude: 4.8 },
    ]);
    expect(offer.Criteres).toEqual({ CritereSecteur: "Enseignement/Formation", CritereContrat: "Stage", Teletravail: "Non" });
    expect(offer.Aveugle).toBe(0);
    expect(offer.DateAnnonce).toBe("23/10/2026 12:33:46");
    expect(offer.DateModification).toBe("25/10/2026 08:02:11");
    expect(offer.NiveauSalaire).toBeUndefined();
  });

  it("échappe le HTML et sépare les paragraphes dans la description", () => {
    const offer = missionToOffer(scMission as MissionRecord, PUBLISHER_IDS.HELLOWORK)!;
    expect(offer.DescriptionPoste).toBe("<p>Première ligne.</p><p>Deuxième &amp; fin.</p>");
    expect(offer.DescriptionEntreprise).toBe("<p>Qui aide.</p>");
  });

  it("place le texte « Profil recherché » en tête puis les prérequis de la mission", () => {
    const profil = missionToOffer(scMission as MissionRecord, PUBLISHER_IDS.HELLOWORK)!.Profil;
    expect(profil.startsWith("<p>Pour postuler à un Service Civique, vous devez obligatoirement :</p>")).toBe(true);
    expect(profil).toContain("619,83 € nets");
    expect(profil.endsWith("<ul><li>Être motivé</li></ul>")).toBe(true);
  });

  it("n'applique ni préfixe ni profil Service Civique aux autres dispositifs, et trace pour le diffuseur demandé", () => {
    const offer = missionToOffer({ ...scMission, publisherId: PUBLISHER_IDS.JEVEUXAIDER, title: "Maintenir un lien" } as MissionRecord, "jobijoba-id")!;
    expect(offer.Poste).toBe("Maintenir un lien");
    expect(offer.Profil).toBe("<ul><li>Être motivé</li></ul>");
    expect(offer.Url_Reponse).toBe("https://api/r/uuid-sc-1/jobijoba-id");
  });

  it("ignore une mission sans organisation, non localisable ou expirée", () => {
    expect(missionToOffer({ ...scMission, organizationName: null } as MissionRecord, PUBLISHER_IDS.HELLOWORK)).toBeNull();
    expect(missionToOffer({ ...scMission, addresses: [{ city: "Lyon", postalCode: null } as any] } as MissionRecord, PUBLISHER_IDS.HELLOWORK)).toBeNull();
    expect(missionToOffer({ ...scMission, endAt: new Date("2020-01-01") } as MissionRecord, PUBLISHER_IDS.HELLOWORK)).toBeNull();
  });

  it("émet toutes les adresses valides, sans plafond", () => {
    const addresses = Array.from({ length: 10 }, (_, i) => ({ city: `Ville ${i}`, postalCode: `6900${i}` }) as any);
    expect(missionToOffer({ ...scMission, addresses } as MissionRecord, PUBLISHER_IDS.HELLOWORK)!.AdressesPostales.AdressePostale).toHaveLength(10);
  });

  it("repli Paris 75001 pour une mission 100 % à distance sans adresse", () => {
    const offer = missionToOffer({ ...scMission, remote: "full", addresses: [] } as MissionRecord, PUBLISHER_IDS.HELLOWORK)!;
    expect(offer.Ville).toBe("Paris");
    expect(offer.AdressesPostales.AdressePostale[0]).toMatchObject({ CodePostal: "75001", Ville: "Paris", Pays: "France" });
    expect(offer.Criteres.Teletravail).toBe("Complet");
  });

  it("mappe télétravail partiel, secteur par défaut et rémunération", () => {
    const offer = missionToOffer(
      {
        ...scMission,
        remote: "possible",
        domain: "inconnu",
        compensationAmount: 620,
        compensationAmountMax: 700,
        compensationUnit: "month",
      } as MissionRecord,
      PUBLISHER_IDS.HELLOWORK
    )!;
    expect(offer.Criteres.Teletravail).toBe("Partiel");
    expect(offer.Criteres.CritereSecteur).toBe("Santé/Social/Association");
    expect(offer.NiveauSalaire).toEqual({ "@_Devise": "EUR", "@_Periodicite": "MONTH", "@_Affichable": "true", SalaireMin: 620, SalaireMax: 700 });
  });
});

describe("buildScTitle", () => {
  it("préfixe un titre ordinaire", () => {
    expect(buildScTitle("  Aider   les aînés ")).toBe("Service Civique - Aider les aînés");
  });

  it.each(["Service civique - Aider", "SERVICE CIVIQUE : Aider", '"Service civique" Aider', "«Service Civique» Aider", "“Service civique - Aider”"])(
    "ne re-préfixe pas %s",
    (title) => {
      expect(buildScTitle(title)).toBe(title);
    }
  );

  it("préfixe un titre qui contient seulement le mot plus loin", () => {
    expect(buildScTitle("Mission de service civique")).toBe("Service Civique - Mission de service civique");
  });
});

describe("utils", () => {
  it("textToHtml convertit les sauts de ligne simples en <br>", () => {
    expect(textToHtml("a\nb\n\nc")).toBe("<p>a<br>b</p><p>c</p>");
    expect(textToHtml(null)).toBe("");
  });

  it("formatDate utilise l'heure de Paris (été et hiver)", () => {
    expect(formatDate(new Date("2026-07-01T10:00:00Z"))).toBe("01/07/2026 12:00:00");
    expect(formatDate(new Date("2026-01-01T10:00:00Z"))).toBe("01/01/2026 11:00:00");
  });

  it("generateXML produit <root>/<offre> avec CDATA et attributs", () => {
    const offer = missionToOffer({ ...scMission, compensationAmount: 620, compensationUnit: "month" } as MissionRecord, PUBLISHER_IDS.HELLOWORK)!;
    const xml = generateXML([offer]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<root>')).toBe(true);
    expect(xml).toContain("<offre>");
    expect(xml).toMatch(/<Nom_Ese>\s*<!\[CDATA\[Une association\]\]>\s*<\/Nom_Ese>/);
    expect(xml).toMatch(/<NiveauSalaire [^>]*Devise="EUR"[^>]*Periodicite="MONTH"[^>]*Affichable="true"/);
  });
});
