import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const baseMission: any = {
  _id: "60d5f1b4e6b3f3b4e8f1b0e1",
  title: "Développeur Web",
  description: "Ceci est une description de mission de plus de 100 caractères pour passer la validation initiale. Il faut que ce soit assez long pour que le test passe.",
  organizationName: "Mon asso",
  city: "Paris",
  postalCode: "75001",
  region: "Île-de-France",
  country: "FR",
  startAt: new Date("2025-01-15").toISOString(),
  createdAt: new Date("2025-01-01").toISOString(),
  endAt: new Date("2025-06-30").toISOString(),
  domain: "environnement",
  remote: "no",
};

describe("missionToLinkedinJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should return a valid LinkedInJob for a valid mission", () => {
    vi.setSystemTime(new Date("2025-01-16")); // diffDays = 1, initialDescription = true
    const job = missionToLinkedinJob(baseMission, defaultCompany);
    expect(job).not.toBeNull();
    expect(job?.partnerJobId).toBe(String(baseMission._id));
    expect(job?.title).toBe(`Bénévolat - ${baseMission.title}`);
    expect(job?.jobtype).toBe("VOLUNTEER");
    expect(job?.applyUrl).toBe(`https://api.api-engagement.beta.gouv.fr/r/${baseMission._id}/test-linkedin-id`);
    expect(job?.description).not.toBeNull(); // Description will be tested in dedicated test
    expect(job?.company).toBe("Mon asso");
    expect(job?.companyId).toBe("12345");
    expect(job?.location).toBe("Paris, France, Île-de-France");
    expect(job?.country).toBe("FR");
    expect(job?.city).toBe("Paris");
    expect(job?.postalCode).toBe("75001");
    expect(job?.listDate).toBe(new Date(baseMission.createdAt).toISOString());
    expect(job?.expirationDate).toBe(new Date(baseMission.endAt).toISOString());
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

    const job = missionToLinkedinJob(
      {
        ...baseMission,
        descriptionHtml,
        domain: "environnement",
        requirements,
        audience: ["seniors", "people_in_difficulty"],
        schedule,
        openToMinors: "no",
      },
      defaultCompany
    );

    const startDate = new Date(baseMission.startAt);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // TOOD: proper mock of vi.setSystemTime to test diffDays
    const expectedDescription = `
      <p><b>Type de mission : </b>${diffDays % 6 < 3 ? `<b>${organizationName}</b> vous propose une mission de bénévolat` : `Ceci est une mission de bénévolat pour <b>${organizationName}</b>`}</p>
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
    const mission = { ...baseMission, openToMinors: "yes" };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Âge minimum : </b>");
  });

  it("shouldnt include block title if audience is undefined", () => {
    const mission = { ...baseMission, audience: undefined };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Public accompagné durant la mission : </b>");
  });

  it("shouldnt include block title if schedule is undefined", () => {
    const mission = { ...baseMission, schedule: undefined };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Durée de la mission : </b>");
  });

  it("shouldnt include block title if requirements is empty", () => {
    const mission = { ...baseMission, requirements: [] };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.description).not.toContain("<b>Pré-requis : </b>");
  });

  it("should use alternate description based on date difference", () => {
    vi.setSystemTime(new Date("2025-01-19")); // diffDays = 4, initialDescription = false
    const job = missionToLinkedinJob(baseMission, defaultCompany);
    expect(job?.description).toContain(`Ceci est une mission de bénévolat pour <b>${baseMission.organizationName}</b>`);
  });

  it("should use return location to FR if not provided", () => {
    const mission = { ...baseMission, city: undefined, country: undefined, region: undefined };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.location).toBe("France");
  });

  it("should use country FR if not provided", () => {
    const mission = { ...baseMission, country: undefined };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.country).toBe("FR");
  });

  it.each([["title"], ["description"], ["organizationName"]])("should return null if %s is missing", (field) => {
    const mission = { ...baseMission, [field]: undefined };
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });

  it("should use defaultCompany when organization is not in LINKEDIN_COMPANY_ID", () => {
    const mission = { ...baseMission, organizationName: "Some Other Org" };
    const job = missionToLinkedinJob(mission, "benevolt");
    expect(job?.company).toBe("benevolt");
    expect(job?.companyId).toBeUndefined();
  });

  it("should use defaultCompany when organizationName is not in LINKEDIN_COMPANY_ID and default is not benevolt", () => {
    const mission = { ...baseMission, organizationName: "Unknown Org" };
    const job = missionToLinkedinJob(mission, "some-default");
    expect(job?.company).toBe("some-default");
    expect(job?.companyId).toBeUndefined();
  });

  it("should correctly map remote status", () => {
    let job = missionToLinkedinJob({ ...baseMission, remote: "full" }, defaultCompany);
    expect(job?.workplaceTypes).toBe("Remote");
    job = missionToLinkedinJob({ ...baseMission, remote: "possible" }, defaultCompany);
    expect(job?.workplaceTypes).toBe("Hybrid");
    job = missionToLinkedinJob({ ...baseMission, remote: "no" }, defaultCompany);
    expect(job?.workplaceTypes).toBe("On-site");
  });

  it("should not have expirationDate if endAt is not provided", () => {
    const mission = { ...baseMission, endAt: undefined };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.expirationDate).toBeUndefined();
  });

  it("should return null for description length > 25000", () => {
    const mission = { ...baseMission, descriptionHtml: "a".repeat(25001) };
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });

  it("should return null for country code length > 2", () => {
    const mission = { ...baseMission, country: "FRA" };
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });

  it("should map domain to industry code", () => {
    const mission = { ...baseMission, domain: "sante" };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.industryCodes).toEqual([{ industryCode: 14 }]);
  });

  it("when domain is not in LINKEDIN_INDUSTRY_CODE, key should be undefined", () => {
    const mission = { ...baseMission, domain: "unknown" };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.industryCodes).toBeUndefined();
  });
});
