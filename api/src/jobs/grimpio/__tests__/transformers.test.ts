import { Schema } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ASC_100_LOGO_URL, JVA_100_LOGO_URL, PUBLISHER_IDS } from "../../../config";
import { Mission } from "../../../types";
import { missionToGrimpioJob, missionToGrimpioJobASC, missionToGrimpioJobJVA } from "../transformers";

// Mock constants with IDs but keep the rest of the config
vi.mock("../config", async () => {
  const config = await vi.importActual<typeof import("../config")>("../config");
  return {
    ...config,
    GRIMPIO_PUBLISHER_ID: "test-grimpio-id",
  };
});

vi.mock("../../../utils/mission", () => ({
  getMissionTrackedApplicationUrl: vi.fn((mission, publisherId) => `https://api.api-engagement.beta.gouv.fr/r/${mission._id}/${publisherId}`),
}));

vi.mock("../utils", () => ({
  getImageUrl: vi.fn((logo, publisherId) => {
    if (logo && logo.endsWith(".png")) {
      return logo;
    }
    return publisherId === PUBLISHER_IDS.SERVICE_CIVIQUE ? "https://asc-logo.com/logo.png" : "https://jva-logo.com/logo.png";
  }),
}));

const baseMission: Partial<Mission> = {
  _id: new Schema.Types.ObjectId("000000000000000000000123"),
  publisherId: PUBLISHER_IDS.JEVEUXAIDER,
  title: "Développeur Web",
  descriptionHtml: "Ceci est une description de mission de plus de 100 caractères pour passer la validation initiale. Il faut que ce soit assez long pour que le test passe.",
  description: "Description text",
  publisherName: "Mon asso",
  organizationName: "Mon Organisation",
  clientId: "mission-123",
  postedAt: new Date("2025-01-01"),
  startAt: new Date("2025-01-15"),
  endAt: new Date("2025-06-30"),
  domain: "environnement",
  activity: "informatique",
  remote: "no",
  schedule: "24h par semaine",
  openToMinors: "no",
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

describe("missionToGrimpioJobJVA", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should return a valid GrimpioJob for a JVA mission with address", () => {
    const mission = { ...baseMission, publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission;
    const job = missionToGrimpioJobJVA(mission);

    expect(job.title).toBe(`Bénévolat - ${mission.title}`);
    expect(job.contractType).toBe("bénévolat");
    expect(job.enterpriseName).toBe(mission.organizationName);
    expect(job.enterpriseIndustry).toBe("Association ONG");
    expect(job.externalId).toBe(mission.clientId);
    expect(job.url).toBe(`https://api.api-engagement.beta.gouv.fr/r/${mission._id}/test-grimpio-id`);
    expect(job.place.city).toBe("Paris");
    expect(job.place.country).toBe("FR");
    expect(job.place.latitude).toBe(48.8566);
    expect(job.place.longitude).toBe(2.3522);
    expect(job.remoteJob).toBe("none");
    expect(job.duration).toBe(mission.schedule);
    expect(job.startingDate).toBe(mission.startAt?.toISOString());
    expect(job.logo).toBe(JVA_100_LOGO_URL);
    expect(job.annualGrossSalary).toBe("");
    expect(job.attachment).toBe("");
    expect(job.levels).toBe("");
    expect(job.email).toBe("");
  });

  it("should return default location when mission has no addresses", () => {
    const mission = { ...baseMission, addresses: [], publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission;
    const job = missionToGrimpioJobJVA(mission);

    expect(job.place.city).toBe("Paris");
    expect(job.place.country).toBe("FR");
    expect(job.place.latitude).toBe(48.8566);
    expect(job.place.longitude).toBe(2.3522);
  });

  it("should correctly map remote status for JVA", () => {
    let job = missionToGrimpioJobJVA({ ...baseMission, remote: "full", publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission);
    expect(job.remoteJob).toBe("total");

    job = missionToGrimpioJobJVA({ ...baseMission, remote: "possible", publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission);
    expect(job.remoteJob).toBe("partial");

    job = missionToGrimpioJobJVA({ ...baseMission, remote: "no", publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission);
    expect(job.remoteJob).toBe("none");
  });

  it("should use JVA logo", () => {
    const mission = { ...baseMission, organizationLogo: "https://example.com/logo.jpg", publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission;
    const job = missionToGrimpioJobJVA(mission);
    expect(job.logo).toBe(JVA_100_LOGO_URL);
  });

  it("should use organizationName or fallback to publisherName", () => {
    let job = missionToGrimpioJobJVA({ ...baseMission, organizationName: "Custom Org", publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission);
    expect(job.enterpriseName).toBe("Custom Org");

    job = missionToGrimpioJobJVA({ ...baseMission, organizationName: "", publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission);
    expect(job.enterpriseName).toBe(baseMission.publisherName);
  });
});

describe("missionToGrimpioJobASC", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should return a valid GrimpioJob for an ASC mission", () => {
    const mission = { ...baseMission, publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE } as Mission;
    const job = missionToGrimpioJobASC(mission);

    expect(job.title).toBe(`Service Civique - ${mission.title}`);
    expect(job.contractType).toBe("service_civique");
    expect(job.enterpriseName).toBe(mission.organizationName);
    expect(job.enterpriseIndustry).toBe("Association - ONG");
    expect(job.externalId).toBe(mission.clientId);
    expect(job.url).toBe(`https://api.api-engagement.beta.gouv.fr/r/${mission._id}/test-grimpio-id`);
    expect(job.place.city).toBe("Paris");
    expect(job.place.country).toBe("FR");
    expect(job.remoteJob).toBe("none");
    expect(job.duration).toBe(mission.schedule);
    expect(job.startingDate).toBe(mission.startAt?.toISOString());
  });

  it("should correctly map remote status for ASC", () => {
    let job = missionToGrimpioJobASC({ ...baseMission, remote: "full", publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE } as Mission);
    expect(job.remoteJob).toBe("total");

    job = missionToGrimpioJobASC({ ...baseMission, remote: "possible", publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE } as Mission);
    expect(job.remoteJob).toBe("partial");

    job = missionToGrimpioJobASC({ ...baseMission, remote: "no", publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE } as Mission);
    expect(job.remoteJob).toBe("none");
  });

  it("should use ASC logo", () => {
    const mission = { ...baseMission, organizationLogo: "https://example.com/logo.jpg", publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE } as Mission;
    const job = missionToGrimpioJobASC(mission);
    expect(job.logo).toBe(ASC_100_LOGO_URL);
  });
});

describe("missionToGrimpioJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should route to JVA function for JVA missions", () => {
    const mission = { ...baseMission, publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission;
    const job = missionToGrimpioJob(mission);

    expect(job.title).toBe(`Bénévolat - ${mission.title}`);
    expect(job.contractType).toBe("bénévolat");
    expect(job.enterpriseIndustry).toBe("Association ONG");
  });

  it("should route to ASC function for Service Civique missions", () => {
    const mission = { ...baseMission, publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE } as Mission;
    const job = missionToGrimpioJob(mission);

    expect(job.title).toBe(`Service Civique - ${mission.title}`);
    expect(job.contractType).toBe("service_civique");
    expect(job.enterpriseIndustry).toBe("Association - ONG");
  });

  it("should handle missing startAt", () => {
    const mission = { ...baseMission, startAt: null, publisherId: PUBLISHER_IDS.JEVEUXAIDER } as unknown as Mission;
    const job = missionToGrimpioJob(mission);
    expect(job.startingDate).toBe("");
  });

  it("should handle missing schedule", () => {
    const mission = { ...baseMission, schedule: "", publisherId: PUBLISHER_IDS.JEVEUXAIDER } as Mission;
    const job = missionToGrimpioJob(mission);
    expect(job.duration).toBe("");
  });
});
