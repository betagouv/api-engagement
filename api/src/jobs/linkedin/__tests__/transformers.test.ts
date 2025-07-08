import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { missionToLinkedinJob } from "../transformers";

// Mock constants from ../config, as this is where they are imported from in transformers.ts
vi.mock("../config", () => ({
  LINKEDIN_ID: "test-linkedin-id",
  LINKEDIN_COMPANY_ID: {
    "Test Org": "12345",
    Benevolt: "54321",
  },
  LINKEDIN_INDUSTRY_CODE: {
    Informatique: "4",
    Santé: "94",
  },
}));

vi.mock("../../../utils/mission", () => ({
  getMissionTrackedApplicationUrl: vi.fn((mission, publisherId) => `https://api.api-engagement.beta.gouv.fr/r/${mission._id}/${publisherId}`),
}));

const defaultCompany = "benevolt";

const baseMission: any = {
  _id: "60d5f1b4e6b3f3b4e8f1b0e1",
  title: "Développeur Web",
  description: "Ceci est une description de mission de plus de 100 caractères pour passer la validation initiale. Il faut que ce soit assez long pour que le test passe.",
  organizationName: "Test Org",
  city: "Paris",
  postalCode: "75001",
  region: "Île-de-France",
  country: "FR",
  startAt: new Date("2025-01-15").toISOString(),
  createdAt: new Date("2025-01-01").toISOString(),
  endAt: new Date("2025-06-30").toISOString(),
  domain: "Informatique",
  remote: "no",
};

describe("missionToLinkedinJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return a valid LinkedInJob for a valid mission", () => {
    vi.setSystemTime(new Date("2025-01-16")); // diffDays = 1, initialDescription = true
    const job = missionToLinkedinJob(baseMission, defaultCompany);
    expect(job).not.toBeNull();
    expect(job?.partnerJobId).toBe(String(baseMission._id));
    expect(job?.title).toBe(`Bénévolat - ${baseMission.title}`);
    expect(job?.jobtype).toBe("VOLUNTEER");
    expect(job?.applyUrl).toBe(`https://api.api-engagement.beta.gouv.fr/r/${baseMission._id}/test-linkedin-id`);
    expect(job?.description).toContain(`Ceci est une mission de bénévolat pour <strong>${baseMission.organizationName}</strong>`);
    expect(job?.company).toBe("Test Org");
    expect(job?.companyId).toBe("12345");
    expect(job?.location).toBe(`${baseMission.city}, ${baseMission.country} ${baseMission.region}`);
    expect(job?.country).toBe("FR");
    expect(job?.city).toBe("Paris");
    expect(job?.postalCode).toBe("75001");
    expect(job?.listDate).toBe(new Date(baseMission.createdAt).toISOString());
    expect(job?.expirationDate).toBe(new Date(baseMission.endAt).toISOString());
    expect(job?.industry).toBe("Informatique");
    expect(job?.industryCodes).toEqual([{ industryCode: "4" }]);
    expect(job?.workplaceTypes).toBe("On-site");
  });

  it("should use country FR if not provided", () => {
    const mission = { ...baseMission, country: undefined };
    const job = missionToLinkedinJob(mission, defaultCompany);
    expect(job?.country).toBe("FR");
  });

  it.each([["title"], ["description"], ["organizationName"], ["city"], ["region"], ["country"]])("should return null if %s is missing", (field) => {
    const mission = { ...baseMission, [field]: undefined };
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });

  it("should use alternate description based on date difference", () => {
    vi.setSystemTime(new Date("2025-01-19")); // diffDays = 4, initialDescription = false
    const job = missionToLinkedinJob(baseMission, defaultCompany);
    expect(job?.description).toContain(`<strong>${baseMission.organizationName}</strong> vous propose une mission de bénévolat`);
    expect(job?.description).toContain(`Type : missions-benevolat`);
  });

  it("should use defaultCompany when organization is not in LINKEDIN_COMPANY_ID", () => {
    const mission = { ...baseMission, organizationName: "Some Other Org" };
    const job = missionToLinkedinJob(mission, "benevolt");
    expect(job?.company).toBe("benevolt");
    expect(job?.companyId).toBe("11022359");
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
    const mission = { ...baseMission, description: "a".repeat(25001) };
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });

  it("should return null for country code length > 2", () => {
    const mission = { ...baseMission, country: "FRA" };
    expect(missionToLinkedinJob(mission, defaultCompany)).toBeNull();
  });
});
