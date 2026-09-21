import { describe, expect, it, vi } from "vitest";

import { missionToServiceCiviqueOffer, missionToSpvOffer } from "@/jobs/leboncoin/transformers";
import { MissionRecord } from "@/types/mission";

vi.mock("../config", async () => {
  const config = await vi.importActual<typeof import("@/jobs/leboncoin/config")>("../config");
  return {
    ...config,
    LEBONCOIN_PUBLISHER_ID: "lbc-id",
    SERVICE_CIVIQUE_PUBLISHER_ID: "sc-id",
    LEBONCOIN_SC_USER_ID: "sc-user",
    LEBONCOIN_SPV_USER_ID: "spv-user",
  };
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
    expect(offer).not.toBeNull();
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
    expect(offer.application).toEqual({ mode: "url", contact: "https://api/r/uuid-sc-1/lbc-id" });
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
  addresses: [{ city: "Aix", postalCode: "13100", departmentCode: "13", departmentName: null, country: "France", street: null, region: null, location: null } as any],
};

describe("missionToSpvOffer", () => {
  it("mappe une mission SPV en offre départementale", () => {
    const offer = missionToSpvOffer(spvMission as MissionRecord)!;
    expect(offer.user_id).toBe("spv-user");
    expect(offer.partner_unique_reference).toBe("spv-13");
    expect(offer.client_reference).toBe("SPV-13");
    expect(offer.title).toBe("Volontariat Sapeur-Pompier - Bouches-du-Rhône");
    expect(offer.contract_type).toBe(7);
    expect(offer.time_type).toBe(2);
    expect(offer.business_sector).toBe(7);
    expect(offer.occupation).toBe(6);
    expect(offer.contract_duration).toBeUndefined();
    expect(offer.location).toEqual({ zip_code: "13001", city: "Marseille", country: "FR" }); // chef-lieu
    expect(offer.description).not.toContain("<"); // HTML nettoyé
    expect(offer.description).toContain("Devenez pompier");
    expect(offer.salary).toBeUndefined(); // indemnités à 0 → objet omis
  });

  it("retourne null si aucune adresse rattachée à un département connu", () => {
    const mission = { ...spvMission, addresses: [{ city: "X", departmentCode: null } as any] };
    expect(missionToSpvOffer(mission as MissionRecord)).toBeNull();
  });
});
