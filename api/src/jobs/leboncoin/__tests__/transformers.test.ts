import { describe, expect, it, vi } from "vitest";

import { missionToBenevolatOffer, missionToServiceCiviqueOffer, missionToSpvOffer } from "@/jobs/leboncoin/transformers";
import { MissionRecord } from "@/types/mission";

vi.mock("../config", async () => {
  const config = await vi.importActual<typeof import("@/jobs/leboncoin/config")>("../config");
  return { ...config, LEBONCOIN_SC_USER_ID: "sc-user", LEBONCOIN_BENEVOLAT_USER_ID: "benevolat-user" };
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
  startAt: new Date("2026-01-15"),
  duration: 8,
  domain: "education",
  activities: ["soutien-scolaire"],
  compensationAmount: 620,
  compensationUnit: "month",
  organizationName: "Une association au nom vraiment très long qui dépasse cinquante caractères",
  organizationLogo: "https://logo.png",
  requirements: ["Motivé"],
  softSkills: ["écoute"],
  romeSkills: [],
  addresses: [{ city: "Lyon", postalCode: "69001", street: "1 rue X", country: "France", departmentCode: "69", departmentName: "Rhône", region: "ARA", location: null } as any],
};

describe("missionToServiceCiviqueOffer", () => {
  it("mappe une mission SC valide", () => {
    const offer = missionToServiceCiviqueOffer(scMission as MissionRecord)!;
    expect(offer.user_id).toBe("sc-user");
    expect(offer.partner_unique_reference).toBe("uuid-sc-1");
    expect(offer.contract_type).toBe(6);
    expect(offer.time_type).toBe(3);
    expect(offer.business_sector).toBe(7); // education
    expect(offer.occupation).toBe(14); // "soutien" → 14
    expect(offer.title).toBe("Service Civique - Aider les personnes âgées");
    expect(offer.description.startsWith("Le Service Civique permet")).toBe(true);
    expect(offer.description).toContain("Description propre");
    expect(offer.start_date).toBe("2026-01-15");
    expect(offer.contract_duration).toEqual({ min: 8, max: 8, duration_type: "month" });
    expect(offer.location).toEqual({ street: "1 rue X", zip_code: "69001", city: "Lyon", country: "FR" });
    expect(offer.salary).toEqual({ min: 620, max: 620, per: "month" });
    expect(offer.application.mode).toBe("url");
    expect(offer.application.contact).toContain("uuid-sc-1");
    expect(offer.company?.name?.length).toBeLessThanOrEqual(50);
    expect(offer.applicant).toMatchObject({ degree: 1, experience: 1, profile: "Motivé", skills: "écoute" });
    expect(offer.pictures).toEqual({ picture: ["https://logo.png"] });
  });

  it("exclut une mission SC sans code postal", () => {
    const mission = { ...scMission, addresses: [{ city: "Lyon", postalCode: null } as any] };
    expect(missionToServiceCiviqueOffer(mission as MissionRecord)).toBeNull();
  });

  it("bascule sur organizationLogo puis omet pictures", () => {
    const noLogo = { ...scMission, domainLogo: null, organizationLogo: null };
    expect(missionToServiceCiviqueOffer(noLogo as MissionRecord)!.pictures).toBeUndefined();
  });
});

const spvMission: Partial<MissionRecord> = {
  _id: "000000000000000000000999",
  id: "uuid-spv-1",
  title: "SDIS 13",
  description: "<h2>Devenez pompier</h2><p>Rejoignez-nous</p>",
  compensationAmount: 0,
  compensationAmountMax: 0,
  compensationUnit: "hour",
  organizationName: "SDIS 13",
  requirements: [],
  softSkills: [],
  romeSkills: [],
  domainLogo: "https://spv-logo.png",
  organizationLogo: null,
  addresses: [
    { city: "Aix", postalCode: "13100", departmentCode: "13", departmentName: null, country: "France", street: null, region: null, location: null } as any,
    { city: "Arles", postalCode: "13200", departmentCode: "13", departmentName: null, country: "France", street: null, region: null, location: null } as any,
  ],
};

describe("missionToSpvOffer", () => {
  it("mappe une mission SPV en offre départementale (localisation forcée au chef-lieu)", () => {
    const offer = missionToSpvOffer(spvMission as MissionRecord)!;
    expect(offer.user_id).toBe("benevolat-user");
    expect(offer.partner_unique_reference).toBe("spv-13");
    expect(offer.client_reference).toBe("SPV-13");
    expect(offer.title).toBe("Volontariat Sapeur-Pompier - Bouches-du-Rhône");
    expect(offer.contract_type).toBe(7);
    expect(offer.time_type).toBe(2);
    expect(offer.business_sector).toBe(7);
    expect(offer.occupation).toBe(6);
    expect(offer.contract_duration).toBeUndefined();
    expect(offer.location).toEqual({ zip_code: "13001", city: "Marseille", country: "FR" }); // chef-lieu, plusieurs adresses ignorées
    expect(offer.description).not.toContain("<"); // HTML nettoyé
    expect(offer.description).toContain("Devenez pompier"); // casse conservée
    expect(offer.salary).toBeUndefined(); // indemnités à 0 → objet omis
  });

  it("retourne null si aucune adresse rattachée à un département connu", () => {
    const mission = { ...spvMission, addresses: [{ city: "X", departmentCode: null } as any] };
    expect(missionToSpvOffer(mission as MissionRecord)).toBeNull();
  });
});

const jvaMission: Partial<MissionRecord> = {
  _id: "000000000000000000000555",
  id: "uuid-jva-1",
  clientId: "349",
  title: "Je maintiens un lien avec des personnes fragiles isolées",
  description: "<b>Présentation</b><br>Prendre des nouvelles des personnes isolées.",
  startAt: new Date("2026-02-01"),
  domain: "solidarite-insertion",
  activities: ["lutte-contre-isolement"],
  compensationAmount: null,
  requirements: [],
  softSkills: [],
  romeSkills: [],
  organizationName: "Ville d'Autun",
  organizationLogo: "https://jva-logo.png",
  addresses: [{ city: "Autun", postalCode: "71400", departmentCode: "71", departmentName: "Saône-et-Loire", country: "France", street: null, region: null, location: null } as any],
};

describe("missionToBenevolatOffer (JeVeuxAider)", () => {
  it("mappe une mission JVA en offre bénévolat", () => {
    const offer = missionToBenevolatOffer(jvaMission as MissionRecord)!;
    expect(offer.user_id).toBe("benevolat-user");
    expect(offer.partner_unique_reference).toBe("uuid-jva-1");
    expect(offer.contract_type).toBe(7);
    expect(offer.time_type).toBe(2);
    expect(offer.business_sector).toBe(16); // solidarite-insertion
    expect(offer.title).toBe("Je maintiens un lien avec des personnes fragiles isolées");
    expect(offer.description).not.toContain("<"); // HTML nettoyé
    expect(offer.description).toContain("Présentation");
    expect(offer.location).toEqual({ street: undefined, zip_code: "71400", city: "Autun", country: "FR" });
    expect(offer.salary).toBeUndefined(); // pas d'indemnité
    expect(offer.contract_duration).toBeUndefined();
  });

  it("tronque un titre trop long à 100 caractères avec …", () => {
    const long = { ...jvaMission, title: "A".repeat(150) };
    const offer = missionToBenevolatOffer(long as MissionRecord)!;
    expect(offer.title.length).toBeLessThanOrEqual(100);
    expect(offer.title.endsWith("…")).toBe(true);
  });

  it("exclut une mission JVA sans code postal", () => {
    const mission = { ...jvaMission, addresses: [{ city: "Autun", postalCode: null } as any] };
    expect(missionToBenevolatOffer(mission as MissionRecord)).toBeNull();
  });
});
