import mongoose from "mongoose";
import MissionModel from "../../src/models/mission";
import PublisherModel from "../../src/models/publisher";
import { Publisher } from "../../src/types";

/**
 * Create a test publisher with random API key
 */
export const createTestPublisher = async (): Promise<Publisher> => {
  const apiKey = "test-api-key-" + Date.now().toString();
  const organizationClientId = "org-" + Date.now().toString();

  const publisher = new PublisherModel({
    name: "Test Publisher",
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    apikey: apiKey,
    organizationClientId,
    organizationName: "Test Organization",
    api: true,
    isAnnonceur: true,
    publishers: [
      {
        publisherId: new mongoose.Types.ObjectId().toString(),
        publisherName: "Test Publisher Name",
      },
    ],
    excludedOrganizations: [],
  });

  await publisher.save();
  return publisher.toObject() as Publisher;
};

/**
 * Create a test mission related to an organization & a publisher
 */
export const createTestMission = async (organizationClientId: string, publisherId: string) => {
  const mission = new MissionModel({
    activity: "environnement",
    addresses: [
      {
        address: "123 Test Street",
        city: "Test City",
        postalCode: "12345",
        departmentCode: "12",
        departmentName: "Test Department",
        region: "Test Region",
      },
    ],
    applicationUrl: `https://api.api-engagement.gouv.fr/mission-id/${publisherId}`,
    audience: ["18-24 ans", "25-34 ans"],
    clientId: "client-" + Date.now().toString(),
    closeToTransport: "yes",
    description: "Test Mission Description",
    duration: 1,
    domain: "bricolage",
    domainLogo: "https://example.com/logo.png",
    endAt: new Date(),
    lastSyncAt: new Date(),
    metadata: "metadata",
    openToMinors: "yes",
    organizationClientId,
    organizationId: new mongoose.Types.ObjectId().toString(),
    organizationName: "Test Organization",
    places: 10,
    postedAt: new Date(),
    priority: "high",
    publisherId,
    publisherName: "Test Publisher",
    publisherUrl: "https://example.com",
    publisherLogo: "https://example.com/logo.png",
    reducedMobilityAccessible: "yes",
    remote: "no",
    schedule: "1 jour par semaine",
    soft_skills: ["Travail en équipe", "Communication"],
    startAt: new Date(),
    statusCode: "ACCEPTED",
    tags: ["tag1", "tag2"],
    tasks: ["task1", "task2"],
    title: "Test Mission",
    type: "mission",
  });

  await mission.save();
  return mission.toObject();
};

/**
 * Create a test publisher partner
 */
export const createTestPartner = async (publisherId: string) => {
  const partner = new PublisherModel({
    name: "Test Partner",
    email: `partner-${Date.now()}@example.com`,
    widget: true,
    api: true,
    campaign: true,
    isAnnonceur: true,
    category: "Test Category",
    url: "https://example.com",
    logo: "https://example.com/logo.png",
    description: "Test partner description",
    publishers: [
      {
        publisherId,
        publisherName: "Test Publisher Name",
      },
    ],
    excludedOrganizations: [],
  });

  await partner.save();
  return partner.toObject();
};
