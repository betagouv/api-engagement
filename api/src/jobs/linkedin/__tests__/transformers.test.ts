import { Types } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Mission } from "../../../types";
import { missionToLinkedinJob } from "../transformers";

// Mock constants with IDs but keep the rest of the config
vi.mock("../config", async () => {
  const config = await vi.importActual<typeof import("../config")>("../config");
  return {
    ...config,
    PUBLISHER_IDS: {
      LINKEDIN: "test-linkedin-id",
    },
    LINKEDIN_COMPANY_ID: {
      "Mon asso": "12345",
      Benevolt: "54321",
    },
    LINKEDIN_PUBLISHER_ID: "test-linkedin-id",
    MISSIONS_PERIODIC_REMOVAL_IDS: ["000000000000000000000123"],
    MISSIONS_PERIODIC_ONLINE_DAYS: 10,
    MISSIONS_PERIODIC_OFFLINE_DAYS: 1,
    MISSIONS_PERIODIC_CYCLE_START_DATE: "2025-09-08",
  };
});

vi.mock("../../../utils/mission", () => ({
  getMissionTrackedApplicationUrl: vi.fn((mission, publisherId) => `https://api.api-engagement.beta.gouv.fr/r/${mission._id}/${publisherId}`),
}));

vi.mock("../utils", () => ({
  getDomainLabel: vi.fn((domain) => `Libellé ${domain}`),
  getAudienceLabel: vi.fn((audience) => `Libellé ${audience}`),
}));

const defaultCompany = "benevolt";

const baseMission: Partial<Mission> = {
  _id: new Types.ObjectId("000000000000000000000123"),
  title: "Développeur Web",
  description: "Ceci est une description de mission de plus de 100 caractères pour passer la validation initiale. Il faut que ce soit assez long pour que le test passe.",
  organizationName: "Mon asso",
  startAt: new Date("2025-01-15"),
  createdAt: new Date("2025-01-01"),
  endAt: new Date("2025-06-30"),
  domain: "environnement",
  remote: "no",
  addresses: [
    {
      city: "Paris",
      postalCode: "75001",
      region: "Île-de-France",
      country: "FR",
      street: "123 rue de test",
      departmentName: "Paris",
      departmentCode: "75",
      location: {
        lat: 48.8566,
        lon: 2.3522,
      },
      geolocStatus: "ENRICHED_BY_PUBLISHER",
    },
  ],
};

describe("missionToLinkedinJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-09"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should return a valid LinkedInJob for a valid mission", () => {
    const job = missionToLinkedinJob(baseMission as Mission, defaultCompany);
    expect(job).not.toBeNull();
    expect(job?.partnerJobId).toBe(String(baseMission._id));
    expect(job?.title).toBe(`Bénévolat - ${baseMission.title}`);
    expect(job?.jobtype).toBe("VOLUNTEER");
    expect(job?.applyUrl).toBe(`https://api.api-engagement.beta.gouv.fr/r/${baseMission._id}/test-linkedin-id`);
    expect(job?.description).not.toBeNull(); // Description will be tested in dedicated test
    expect(job?.company).toBe("Mon asso");
    expect(job?.companyId).toBe("12345");
    expect(job?.location).toBe("Paris, France");
    // When location is provided, country and city are not mandatory
    expect(job?.country).toBeUndefined();
    expect(job?.city).toBeUndefined();
    expect(job?.postalCode).toBeUndefined();
    expect(job?.listDate).toBe(baseMission.createdAt?.toISOString());
    expect(job?.expirationDate).toBe(baseMission.endAt?.toISOString());
    expect(job?.industryCodes).toEqual([{ industryCode: 2368 }]);
    expect(job?.workplaceTypes).toBe("On-site");
  });

  it("should format description with correct data", () => {
    // JVA missions should have a description with the following structure
    const descriptionHtml = `
      <b>Présentation de la mission</b><br>
      <p>Description</p>
      <p>Sautez le pas</p><br>
      <p>Texte</p>
      <p>Précisions</p><br>
      <p>Texte de précisions</p>`;
    const organizationName = "Mon asso";
    const requirements = ["Précision 1", "Précision 2"];
    const schedule = "un jour par semaine";

    const mission = {
      ...baseMission,
      descriptionHtml,
      domain: "environnement",
      requirements,
      audience: ["seniors", "people_in_difficulty"],
      schedule,
      openToMinors: "no",
    } as Mission;

    const job = missionToLinkedinJob(mission, defaultCompany);

    const expectedDescription = `
      <p><b>Type de mission : </b><b>${organizationName}</b> vous propose une mission de bénévolat</p>
      <p><b>Domaine d'activité : </b>Libellé environnement</p>
      ${descriptionHtml}
      <p><b>Pré-requis : </b></p>
      <ol>
        <li>${requirements[0]}</li>
        <li>${requirements[1]}</li>
      </ol>
      <p><b>Public accompagné durant la mission : </b></p>
      <p>Libellé seniors - Libellé people_in_difficulty</p>
      <p><b>Durée de la mission : </b>${schedule}</p>
      <p><b>Âge minimum : </b>18 ans minimum</p>
    `;

    // Compare strings with normalized whitespace
    function normalizeHtml(str: string) {
      return str.replace(/\s+/g, " ").trim();
    }
    expect(normalizeHtml(job?.description ?? "")).toBe(normalizeHtml(expectedDescription));
  });

  it("shouldnt include block title if openToMinors is yes", () => {
    const mission = { ...baseMission, openToMinors: "yes" } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Âge minimum : </b>");
  });

  it("shouldnt include block title if audience is empty", () => {
    const mission = { ...baseMission, audience: [] } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Public accompagné durant la mission : </b>");
  });

  it("shouldnt include block title if schedule is empty", () => {
    const mission = { ...baseMission, schedule: "" } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Durée de la mission : </b>");
  });

  it("shouldnt include block title if requirements is empty", () => {
    const mission = { ...baseMission, requirements: [] } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Pré-requis : </b>");
  });

  it("should exclude missions on offline day", () => {
    vi.setSystemTime(new Date("2025-09-08"));
    const job = missionToLinkedinJob(baseMission as Mission, defaultCompany);
    expect(job).toBeNull();
  });

  it("should use location fields when present and no address are provided", () => {
    const mission = { ...baseMission, addresses: [], country: "FR", city: "Nantes", postalCode: "44000" } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.country).toBe("FR");
    expect(job?.city).toBe("Nantes");
    expect(job?.postalCode).toBe("44000");
  });

  it("should use country to FR if address and no located fields are provided", () => {
    const mission = { ...baseMission, addresses: [] } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.country).toBe("FR");
  });

  it("should return null if country is not valid", () => {
    const mission = { ...baseMission, addresses: [], country: "invalid" } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job).toBeNull();
  });

  it("should have alternate locations if mission has multiple addresses", () => {
    const addresses = [
      { ...baseMission.addresses?.[0], city: "Lyon", region: "Rhône-Alpes", country: "FR", postalCode: "69001" },
      { ...baseMission.addresses?.[0], city: "Marseille", region: "Provence-Alpes-Côte d'Azur", country: "FR", postalCode: "13001" },
    ];
    const mission = { ...baseMission, addresses } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.alternateLocations?.alternateLocation).toHaveLength(2);
    expect(job?.alternateLocations?.alternateLocation).toContain("Lyon, France");
    expect(job?.alternateLocations?.alternateLocation).toContain("Marseille, France");
  });

  it("should not have alternate locations if mission has only one address", () => {
    const mission = { ...baseMission } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.alternateLocations).toBeUndefined();
  });

  it("should limit alternate locations to 7", () => {
    const addresses = Array.from({ length: 8 }, (_, i) => ({ ...baseMission.addresses?.[0], city: `City ${i}`, region: `Region ${i}`, country: "FR", postalCode: `12345${i}` }));
    const mission = { ...baseMission, addresses } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.alternateLocations?.alternateLocation).toHaveLength(7);
    expect(job?.alternateLocations?.alternateLocation).toContain("City 0, France");
    expect(job?.alternateLocations?.alternateLocation).toContain("City 1, France");
    expect(job?.alternateLocations?.alternateLocation).toContain("City 2, France");
    expect(job?.alternateLocations?.alternateLocation).toContain("City 3, France");
    expect(job?.alternateLocations?.alternateLocation).toContain("City 4, France");
    expect(job?.alternateLocations?.alternateLocation).toContain("City 5, France");
    expect(job?.alternateLocations?.alternateLocation).toContain("City 6, France");
  });

  it.each([["title"], ["description"], ["organizationName"]])("should return null if %s is missing", (field) => {
    const mission = { ...baseMission, [field]: undefined } as Mission;
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });

  it("should use defaultCompany when organization is not in LINKEDIN_COMPANY_ID", () => {
    const mission = { ...baseMission, organizationName: "Some Other Org" } as Mission;
    const job = missionToLinkedinJob(mission, "benevolt");
    expect(job?.company).toBe("benevolt");
    expect(job?.companyId).toBeUndefined();
  });

  it("should use defaultCompany when organizationName is not in LINKEDIN_COMPANY_ID and default is not benevolt", () => {
    const mission = { ...baseMission, organizationName: "Unknown Org" } as Mission;
    const job = missionToLinkedinJob(mission, "some-default");
    expect(job?.company).toBe("some-default");
    expect(job?.companyId).toBeUndefined();
  });

  it("should correctly map remote status", () => {
    let job = missionToLinkedinJob({ ...baseMission, remote: "full" } as Mission, defaultCompany);
    expect(job?.workplaceTypes).toBe("Remote");
    job = missionToLinkedinJob({ ...baseMission, remote: "possible" } as Mission, defaultCompany);
    expect(job?.workplaceTypes).toBe("Hybrid");
    job = missionToLinkedinJob({ ...baseMission, remote: "no" } as Mission, defaultCompany);
    expect(job?.workplaceTypes).toBe("On-site");
  });

  it("should not have expirationDate if endAt is not provided", () => {
    const mission = { ...baseMission, endAt: null } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.expirationDate).toBeUndefined();
  });

  it("should return null for description length > 25000", () => {
    const mission = { ...baseMission, descriptionHtml: "a".repeat(25001) } as Mission;
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });

  it("should map domain to industry code", () => {
    const mission = { ...baseMission, domain: "sante" } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.industryCodes).toEqual([{ industryCode: 14 }]);
  });

  it("when domain is not in LINKEDIN_INDUSTRY_CODE, key should be undefined", () => {
    const mission = { ...baseMission, domain: "unknown" } as Mission;
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.industryCodes).toBeUndefined();
  });
});
