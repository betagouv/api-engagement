import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissionRecord } from "../../../types/mission";
import { missionToTalentJob } from "../transformers";

// Mock constants with IDs but keep the rest of the config
vi.mock("../config", async () => {
  const config = await vi.importActual<typeof import("../config")>("../config");
  return {
    ...config,
    TALENT_PUBLISHER_ID: "test-talent-id",
  };
});

vi.mock("../../../utils/mission", () => ({
  getMissionTrackedApplicationUrl: vi.fn((mission, publisherId) => `https://api.api-engagement.beta.gouv.fr/r/${mission._id}/${publisherId}`),
}));

vi.mock("../utils", () => ({
  getActivityCategory: vi.fn((activity) => `Category ${activity}`),
  getImageUrl: vi.fn((logo) => logo || "https://default-logo.com/logo.png"),
}));

const baseMission: Partial<MissionRecord> = {
  _id: "000000000000000000000123",
  title: "Développeur Web",
  descriptionHtml: "Ceci est une description de mission de plus de 100 caractères pour passer la validation initiale. Il faut que ce soit assez long pour que le test passe.",
  publisherName: "Mon asso",
  postedAt: new Date("2025-01-01"),
  endAt: new Date("2025-06-30"),
  activities: ["informatique"],
  remote: "no",
  organizationLogo: "https://example.com/logo.png",
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
      geoPoint: {
        type: "Point",
        coordinates: [2.3522, 48.8566],
      },
      geolocStatus: "ENRICHED_BY_PUBLISHER",
    },
  ],
};

describe("missionToTalentJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should return a valid TalentJob array for a mission with addresses", () => {
    const jobs = missionToTalentJob(baseMission as MissionRecord);
    expect(jobs).toHaveLength(1);

    const job = jobs[0];
    expect(job.referencenumber).toBe(String(baseMission._id));
    expect(job.title).toBe(`Bénévolat - ${baseMission.title}`);
    expect(job.company).toBe(baseMission.publisherName);
    expect(job.city).toBe("Paris");
    expect(job.state).toBe("Île-de-France");
    expect(job.country).toBe("FR");
    expect(job.streetaddress).toBe("123 rue de test");
    expect(job.postalcode).toBe("75001");
    expect(job.dateposted).toBe(baseMission.postedAt?.toISOString());
    expect(job.url).toBe(`https://api.api-engagement.beta.gouv.fr/r/${baseMission._id}/test-talent-id`);
    expect(job.description).toBe(baseMission.descriptionHtml);
    expect(job.jobtype).toBe("part-time");
    expect(job.expirationdate).toBe(baseMission.endAt?.toISOString());
    expect(job.isremote).toBe("no");
    expect(job.category).toBe("Category informatique");
    expect(job.logo).toBe("https://example.com/logo.png");
  });

  it("should return one job per address when mission has multiple addresses", () => {
    const addresses = [
      { ...baseMission.addresses?.[0], city: "Lyon", region: "Rhône-Alpes", postalCode: "69000", street: undefined },
      { ...baseMission.addresses?.[0], city: "Marseille", region: "Provence-Alpes-Côte d'Azur", postalCode: "13000", street: "13 rue de test" },
    ];
    const mission = { ...baseMission, addresses } as MissionRecord;
    const jobs = missionToTalentJob(mission);

    expect(jobs).toHaveLength(2);
    expect(jobs[0].city).toBe("Lyon");
    expect(jobs[0].state).toBe("Rhône-Alpes");
    expect(jobs[0].streetaddress).toBeUndefined();
    expect(jobs[0].postalcode).toBe("69000");
    expect(jobs[1].city).toBe("Marseille");
    expect(jobs[1].state).toBe("Provence-Alpes-Côte d'Azur");
    expect(jobs[1].streetaddress).toBe("13 rue de test");
    expect(jobs[1].postalcode).toBe("13000");
    // Both jobs should have the same base properties
    jobs.forEach((job) => {
      expect(job.referencenumber).toBe(String(mission._id));
      expect(job.title).toBe(`Bénévolat - ${mission.title}`);
      expect(job.company).toBe(mission.publisherName);
    });
  });

  it("should return default location when mission has no addresses", () => {
    const mission = { ...baseMission, addresses: [] } as MissionRecord;
    const jobs = missionToTalentJob(mission);

    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.city).toBe("Paris");
    expect(job.state).toBe("Île-de-France");
    expect(job.country).toBe("FR");
    expect(job.streetaddress).toBeUndefined();
  });

  it("should correctly map remote status", () => {
    let jobs = missionToTalentJob({ ...baseMission, remote: "full" } as MissionRecord);
    expect(jobs[0].isremote).toBe("yes");

    jobs = missionToTalentJob({ ...baseMission, remote: "possible" } as MissionRecord);
    expect(jobs[0].isremote).toBe("yes");

    jobs = missionToTalentJob({ ...baseMission, remote: "no" } as MissionRecord);
    expect(jobs[0].isremote).toBe("no");
  });

  it("should not have expirationdate if endAt is not provided", () => {
    const mission = { ...baseMission, endAt: null } as MissionRecord;
    const jobs = missionToTalentJob(mission);
    expect(jobs[0].expirationdate).toBeUndefined();
  });

  it("should use organizationLogo when provided", () => {
    const mission = { ...baseMission, organizationLogo: "https://custom-logo.com/logo.png" } as MissionRecord;
    const jobs = missionToTalentJob(mission);
    expect(jobs[0].logo).toBe("https://custom-logo.com/logo.png");
  });

  it("should use default logo when organizationLogo is undefined", () => {
    const mission = { ...baseMission, organizationLogo: undefined } as unknown as MissionRecord;
    const jobs = missionToTalentJob(mission);
    expect(jobs[0].logo).toBe("https://default-logo.com/logo.png");
  });

  it("should use getActivityCategory for category mapping", () => {
    const mission = { ...baseMission, activity: "art" } as MissionRecord;
    const jobs = missionToTalentJob(mission);
    expect(jobs[0].category).toBe("Category art");
  });

  it("should format dateposted correctly", () => {
    const mission = { ...baseMission, postedAt: new Date("2025-01-15T10:30:00Z") } as MissionRecord;
    const jobs = missionToTalentJob(mission);
    expect(jobs[0].dateposted).toBe("2025-01-15T10:30:00.000Z");
  });
});
