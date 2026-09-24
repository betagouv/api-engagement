import { describe, expect, it, vi } from "vitest";

import { missionToOffer } from "@/jobs/leboncoin/transformers";
import { MissionRecord } from "@/types/mission";

vi.mock("../config", async () => {
  const config = await vi.importActual<typeof import("@/jobs/leboncoin/config")>("../config");
  return { ...config, LEBONCOIN_USER_IDS: { "service-civique": "sc-user", spv: "spv-user", jva: "jva-user" } };
});

vi.mock("../../../utils/mission", () => ({
  getMissionTrackedApplicationUrl: vi.fn((mission, publisherId) => `https://api/r/${mission.id}/${publisherId}`),
}));

const scMission: Partial<MissionRecord> = {
  _id: "000000000000000000000123",
  id: "uuid-sc-1",
  clientId: "client-123",
  title: "Aider les personnes âgées",
  description: "Description propre sans HTML.",
  domain: "education",
  activities: ["soutien-scolaire"],
  organizationName: "Une association au nom vraiment très long qui dépasse cinquante caractères",
  organizationLogo: "https://logo.png",
  addresses: [{ city: "Lyon", postalCode: "69001", street: "1 rue X", country: "France", departmentCode: "69", departmentName: "Rhône", region: "ARA", location: null } as any],
};

describe("missionToOffer — service-civique", () => {
  it("mappe une mission SC valide (structure plate de l'exemple)", () => {
    const offer = missionToOffer(scMission as MissionRecord, "service-civique")!;
    expect(offer.user_id).toBe("sc-user");
    expect(offer.partner_unique_reference).toBe("uuid-sc-1");
    expect(offer.contract_type).toBe("Stage");
    expect(offer.time).toEqual({ type: "Temps plein ou temps partiel" });
    expect(offer.business_sector).toBe(7); // education
    expect(offer.occupation).toBe(14); // "soutien" → 14
    expect(offer.title).toBe("Service Civique - Aider les personnes âgées");
    expect(offer.description.startsWith("Le Service Civique permet")).toBe(true);
    expect(offer.description).toContain("Description propre");
    expect(offer.location).toEqual({ city: "Lyon", zip_code: "69001", country: "FR" });
    expect(offer.application).toEqual({ mode: "URL", contact: "https://api/r/uuid-sc-1/60cd04a0d2321e05a743fa8d" });
    expect(offer.company).toBe("Une association au nom vraiment très long qui dépa"); // tronqué à 50
    expect(offer.company!.length).toBe(50);
    expect(offer.logo).toBe("https://logo.png");
    expect(offer.client_reference).toBe("client-123");
  });

  it("exclut une mission SC sans code postal", () => {
    const mission = { ...scMission, addresses: [{ city: "Lyon", postalCode: null } as any] };
    expect(missionToOffer(mission as MissionRecord, "service-civique")).toBeNull();
  });

  it("prend la première adresse valable en ignorant une adresse incomplète", () => {
    const mission = {
      ...scMission,
      addresses: [{ city: "Paris", postalCode: null } as any, { city: "Nantes", postalCode: "44000" } as any],
    };
    expect(missionToOffer(mission as MissionRecord, "service-civique")!.location).toEqual({ city: "Nantes", zip_code: "44000", country: "FR" });
  });

  it("logo = logo du partenaire, pictures = image de la mission", () => {
    const offer = missionToOffer({ ...scMission, domainLogo: "https://dl.png" } as MissionRecord, "service-civique")!;
    expect(offer.logo).toBe("https://logo.png"); // organizationLogo
    expect(offer.pictures).toEqual({ picture: ["https://dl.png"] }); // domainLogo
    const noImages = missionToOffer({ ...scMission, domainLogo: null, organizationLogo: null } as MissionRecord, "service-civique")!;
    expect(noImages.logo).toBeUndefined();
    expect(noImages.pictures).toBeUndefined();
  });
});

describe("missionToOffer — mission à distance", () => {
  it("préfixe le titre et localise à Paris 75001 (SC entièrement à distance, sans adresse)", () => {
    const remote = { ...scMission, remote: "full" as const, addresses: [] };
    const offer = missionToOffer(remote as MissionRecord, "service-civique")!;
    expect(offer.title.startsWith("[À distance] Service Civique - ")).toBe(true);
    expect(offer.title.length).toBeLessThanOrEqual(100);
    expect(offer.location).toEqual({ city: "Paris", zip_code: "75001", country: "FR" });
  });

  it("ne préfixe pas et garde l'adresse quand remote = possible", () => {
    const offer = missionToOffer({ ...scMission, remote: "possible" as const } as MissionRecord, "service-civique")!;
    expect(offer.title.startsWith("[À distance]")).toBe(false);
    expect(offer.location.city).toBe("Lyon");
  });
});

const spvMission: Partial<MissionRecord> = {
  _id: "000000000000000000000999",
  id: "uuid-spv-1",
  clientId: "sdis13-ref",
  title: "SDIS 13",
  description: "<h2>Devenez pompier</h2><p>Rejoignez-nous</p>",
  organizationName: "SDIS 13",
  domainLogo: "https://spv-logo.png",
  organizationLogo: null,
  addresses: [
    { city: "Aix", postalCode: "13100", departmentCode: "13", departmentName: null, country: "France", street: null, region: null, location: null } as any,
    { city: "Arles", postalCode: "13200", departmentCode: "13", departmentName: null, country: "France", street: null, region: null, location: null } as any,
  ],
};

describe("missionToOffer — spv", () => {
  it("mappe une mission SPV en offre départementale (localisation forcée au chef-lieu)", () => {
    const offer = missionToOffer(spvMission as MissionRecord, "spv")!;
    expect(offer.user_id).toBe("spv-user");
    expect(offer.partner_unique_reference).toBe("uuid-spv-1");
    expect(offer.client_reference).toBe("sdis13-ref");
    expect(offer.title).toBe("Volontariat Sapeur-Pompier - Bouches-du-Rhône");
    expect(offer.contract_type).toBe("Bénévolat");
    expect(offer.time).toEqual({ type: "Temps partiel" });
    expect(offer.business_sector).toBe(7);
    expect(offer.occupation).toBe(6);
    expect(offer.location).toEqual({ city: "Marseille", zip_code: "13001", country: "FR" }); // chef-lieu
    expect(offer.description).not.toContain("<"); // HTML nettoyé
    expect(offer.description).toContain("Devenez pompier"); // casse conservée
  });

  it("retourne null si aucune adresse rattachée à un département connu", () => {
    const mission = { ...spvMission, addresses: [{ city: "X", departmentCode: null } as any] };
    expect(missionToOffer(mission as MissionRecord, "spv")).toBeNull();
  });
});

const jvaMission: Partial<MissionRecord> = {
  _id: "000000000000000000000555",
  id: "uuid-jva-1",
  clientId: "349",
  title: "Je maintiens un lien avec des personnes fragiles isolées",
  description: "<b>Présentation</b><br>Prendre des nouvelles des personnes isolées.",
  domain: "solidarite-insertion",
  activities: ["lutte-contre-isolement"],
  organizationName: "Ville d'Autun",
  organizationLogo: "https://jva-logo.png",
  addresses: [{ city: "Autun", postalCode: "71400", departmentCode: "71", departmentName: "Saône-et-Loire", country: "France", street: null, region: null, location: null } as any],
};

describe("missionToOffer — jva", () => {
  it("mappe une mission JeVeuxAider en offre bénévolat", () => {
    const offer = missionToOffer(jvaMission as MissionRecord, "jva")!;
    expect(offer.user_id).toBe("jva-user");
    expect(offer.partner_unique_reference).toBe("uuid-jva-1");
    expect(offer.contract_type).toBe("Bénévolat");
    expect(offer.time).toEqual({ type: "Temps partiel" });
    expect(offer.business_sector).toBe(16); // solidarite-insertion
    expect(offer.title).toBe("Je maintiens un lien avec des personnes fragiles isolées");
    expect(offer.description).not.toContain("<"); // HTML nettoyé
    expect(offer.description).toContain("Présentation");
    expect(offer.location).toEqual({ city: "Autun", zip_code: "71400", country: "FR" });
  });

  it("tronque un titre trop long à 100 caractères avec …", () => {
    const long = { ...jvaMission, title: "A".repeat(150) };
    const offer = missionToOffer(long as MissionRecord, "jva")!;
    expect(offer.title.length).toBeLessThanOrEqual(100);
    expect(offer.title.endsWith("…")).toBe(true);
  });

  it("exclut une mission JVA sans code postal", () => {
    const mission = { ...jvaMission, addresses: [{ city: "Autun", postalCode: null } as any] };
    expect(missionToOffer(mission as MissionRecord, "jva")).toBeNull();
  });
});
