import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Mission } from "../../../types";
import { missionToLinkedinJobs } from "../transformers";

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

const defaultCompany = "benevolt";

const baseMission: Partial<Mission> = {
  title: "Développeur Web",
  description: "Ceci est une description de mission de plus de 100 caractères pour passer la validation initiale. Il faut que ce soit assez long pour que le test passe.",
  organizationName: "Mon asso",
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
  startAt: new Date("2025-01-15"),
  createdAt: new Date("2025-01-01"),
  endAt: new Date("2025-06-30"),
  domain: "environnement",
  remote: "no",
};

describe("missionToLinkedinJobs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return a valid LinkedInJob for a valid mission", () => {
    vi.setSystemTime(new Date("2025-01-16")); // diffDays = 1, initialDescription = true
    const jobs = missionToLinkedinJobs(baseMission as Mission, defaultCompany);
    const job = jobs[0];
    expect(job).not.toBeNull();
    expect(job.partnerJobId).toBe(String(baseMission._id));
    expect(job.title).toBe(`Bénévolat - ${baseMission.title}`);
    expect(job.jobtype).toBe("VOLUNTEER");
    expect(job.applyUrl).toBe(`https://api.api-engagement.beta.gouv.fr/r/${baseMission._id}/test-linkedin-id`);
    expect(job.description).not.toBeNull(); // Description will be tested in dedicated test
    expect(job.company).toBe("Mon asso");
    expect(job.companyId).toBe("12345");
    expect(job.location).toBe("Paris, France, Île-de-France");
    expect(job.country).toBe("FR");
    expect(job.city).toBe("Paris");
    expect(job.postalCode).toBe("75001");
    expect(job.listDate).toBe(baseMission.createdAt?.toISOString());
    expect(job.expirationDate).toBe(baseMission.endAt?.toISOString());
    expect(job.industry).toBe("environnement");
    expect(job.industryCodes).toEqual([{ industryCode: 2368 }]);
    expect(job.workplaceTypes).toBe("On-site");
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
    const domain = "environnement";
    const requirements = ["Précision 1", "Précision 2"];
    const audience = ["Jeunes"];
    const schedule = "un jour par semaine";

    const mission = {
      ...baseMission,
      descriptionHtml,
      domain,
      requirements,
      audience,
      schedule,
      openToMinors: "no",
    } as Mission;

    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    const job = jobs[0];

    const startDate = mission.startAt;
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const expectedDescription = `
      <p><b>Type de mission : </b><br>
      ${diffDays % 6 < 3 ? `<p><b>${organizationName}</b> vous propose une mission de bénévolat</p>` : `<p>Ceci est une mission de bénévolat pour <b>${organizationName}</b></p>`}
      <p><b>Domaine d'activité</b></p>
      <p>${domain}</p>
      ${descriptionHtml}
      <p><b>Pré-requis : </b></p>
      <ol>
        <li>${requirements[0]}</li>
        <li>${requirements[1]}</li>
      </ol>
      <p><b>Public accompagné durant la mission : </b></p>
      <p>${audience.join(", ")}</p>
      <p><b>Durée de la mission : </b></p>
      <p>${schedule}</p>
      <p><b>Âge minimum : </b></p>
      <p>18 ans minimum.</p>
    `;

    // Compare strings with normalized whitespace
    function normalizeHtml(str: string) {
      return str.replace(/\s+/g, " ").trim();
    }
    expect(normalizeHtml(job?.description ?? "")).toBe(normalizeHtml(expectedDescription));
  });

  it("shouldnt include block title if openToMinors is yes", () => {
    const mission = { ...baseMission, openToMinors: "yes" } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].description).not.toContain("<b>Âge minimum : </b>");
  });

  it("shouldnt include block title if audience is empty", () => {
    const mission = { ...baseMission, audience: [] } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].description).not.toContain("<b>Public accompagné durant la mission : </b>");
  });

  it("shouldnt include block title if schedule is undefined", () => {
    const mission = { ...baseMission, schedule: "" } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].description).not.toContain("<b>Durée de la mission : </b>");
  });

  it("shouldnt include block title if requirements is empty", () => {
    const mission = { ...baseMission, requirements: [] } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].description).not.toContain("<b>Pré-requis : </b>");
  });

  it("should use alternate description based on date difference", () => {
    vi.setSystemTime(new Date("2025-01-19")); // diffDays = 4, initialDescription = false
    const jobs = missionToLinkedinJobs(baseMission as Mission, defaultCompany);
    expect(jobs[0].description).toContain(`Ceci est une mission de bénévolat pour <b>${baseMission.organizationName}</b>`);
  });

  it("should use country FR if not provided", () => {
    const mission = { ...baseMission } as Mission;
    mission.addresses[0].country = "";
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].country).toBe("FR");
  });

  it.each([["title"], ["description"], ["organizationName"]])("should return empty array if %s is missing", (field) => {
    const mission = { ...baseMission, title: "" } as Mission;
    expect(missionToLinkedinJobs(mission, defaultCompany)).toHaveLength(0);
  });

  it("should use defaultCompany when organization is not in LINKEDIN_COMPANY_ID", () => {
    const mission = { ...baseMission, organizationName: "Some Other Org" } as Mission;
    const jobs = missionToLinkedinJobs(mission, "benevolt");
    expect(jobs[0].company).toBe("benevolt");
    expect(jobs[0].companyId).toBeUndefined();
  });

  it("should use defaultCompany when organizationName is not in LINKEDIN_COMPANY_ID and default is not benevolt", () => {
    const mission = { ...baseMission, organizationName: "Unknown Org" } as Mission;
    const jobs = missionToLinkedinJobs(mission, "some-default");
    expect(jobs[0].company).toBe("some-default");
    expect(jobs[0].companyId).toBeUndefined();
  });

  it("should correctly map remote status", () => {
    let jobs = missionToLinkedinJobs({ ...baseMission, remote: "full" } as Mission, defaultCompany);
    expect(jobs[0].workplaceTypes).toBe("Remote");
    jobs = missionToLinkedinJobs({ ...baseMission, remote: "possible" } as Mission, defaultCompany);
    expect(jobs[0].workplaceTypes).toBe("Hybrid");
    jobs = missionToLinkedinJobs({ ...baseMission, remote: "no" } as Mission, defaultCompany);
    expect(jobs[0].workplaceTypes).toBe("On-site");
  });

  it("should not have expirationDate if endAt is not provided", () => {
    const mission = { ...baseMission, endAt: null } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].expirationDate).toBeUndefined();
  });

  it("should map domain to industry code", () => {
    const mission = { ...baseMission, domain: "sante" } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].industryCodes).toEqual([{ industryCode: 14 }]);
  });

  it("when domain is not in LINKEDIN_INDUSTRY_CODE, key should be undefined", () => {
    const mission = { ...baseMission, domain: "unknown" } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs[0].industryCodes).toBeUndefined();
  });

  it("should return empty array for description length > 25000", () => {
    const mission = { ...baseMission, descriptionHtml: "a".repeat(25001) } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs).toHaveLength(0);
  });

  it("should return empty array for country code length > 2", () => {
    const mission = { ...baseMission } as Mission;
    mission.addresses[0].country = "FRA";
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs).toHaveLength(0);
  });

  it("should return array of jobs when mission has multiple addresses", () => {
    const mission = { ...baseMission } as Mission;
    const address = mission.addresses[0];
    address.city = "Lyon";
    address.country = "FR";
    address.region = "Auvergne-Rhône-Alpes";
    address.postalCode = "69001";
    mission.addresses.push(address);
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs).toHaveLength(2);
  });

  it("should return empty array when mission has no addresses", () => {
    const mission = { ...baseMission, addresses: [] } as Mission;
    const jobs = missionToLinkedinJobs(mission, defaultCompany);
    expect(jobs).toHaveLength(0);
  });

  it("should return array with single job when multiAddresses is false", () => {
    const mission = { ...baseMission } as Mission;
    const address = mission.addresses[0];
    address.city = "Lyon";
    address.country = "FR";
    address.region = "Auvergne-Rhône-Alpes";
    address.postalCode = "69001";
    mission.addresses.push(address);
    const jobs = missionToLinkedinJobs(mission, defaultCompany, false);
    expect(jobs).toHaveLength(1);
  });
});
