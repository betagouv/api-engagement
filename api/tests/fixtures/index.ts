import mongoose from "mongoose";
import ImportModel from "../../src/models/import";
import MissionModel from "../../src/models/mission";
import PublisherModel from "../../src/models/publisher";
import { Import, Mission, MissionType, Publisher } from "../../src/types";

/**
 * Create a test publisher with random API key
 */
export const createTestPublisher = async (data: Partial<Publisher> = {}): Promise<Publisher> => {
  const apiKey = "test-api-key-" + Date.now().toString();
  const organizationClientId = "org-" + Date.now().toString();

  const defaultData = {
    name: "Test Publisher",
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    apikey: apiKey,
    organizationClientId,
    organizationName: "Test Organization",
    missionType: MissionType.BENEVOLAT,
    url: "https://example.com",
    logo: "https://example.com/logo.png",
    description: "Test Publisher Description",
    hasWidgetRights: true,
    hasCampaignRights: true,
    hasApiRights: true,
    publishers: [
      {
        publisherId: new mongoose.Types.ObjectId().toString(),
        publisherName: "Test Publisher Name",
      },
    ],
    excludedOrganizations: [],
  };

  const publisherData = { ...defaultData, ...data };
  const publisher = new PublisherModel(publisherData);

  await publisher.save();
  return publisher.toObject() as Publisher;
};

/**
 * Create a test mission related to an organization & a publisher
 */
export const createTestMission = async (data: Partial<Mission> = {}) => {
  const defaultData = {
    activity: "environnement",
    addresses: [
      {
        address: "123 Test Street",
        city: "Test City",
        postalCode: "12345",
        departmentCode: "12",
        departmentName: "Test Department",
        region: "Test Region",
        location: { lat: 0, lon: 0 },
        geoPoint: { type: "Point", coordinates: [0, 0] },
      },
    ],
    applicationUrl: `https://api.api-engagement.gouv.fr/mission-id/${data.publisherId || "test-publisher-id"}`,
    audience: ["18-24 ans", "25-34 ans"],
    clientId: "client-" + Date.now().toString(),
    closeToTransport: "yes",
    description: "Test Mission Description",
    descriptionHtml: "Test Mission Description<br/>Html",
    duration: 1,
    domain: "bricolage",
    domainLogo: "https://example.com/logo.png",
    endAt: new Date(),
    lastSyncAt: new Date(),
    metadata: "metadata",
    openToMinors: "yes",
    organizationCity: "Nantes",
    organizationClientId: "6789",
    organizationDescription: "",
    organizationFullAddress: "Organizaiton full address",
    organizationId: "123233",
    organizationLogo: "https://example.com/logo.png",
    organizationName: "Organization name",
    organizationPostCode: "12345",
    organizationRNA: "W1234567890",
    organizationSiren: "",
    organizationStatusJuridique: "Association",
    organizationType: "",
    organizationUrl: "http://example.com",
    places: 10,
    postedAt: new Date(),
    priority: "high",
    publisherId: "test-publisher-id",
    publisherName: "Test Publisher",
    publisherUrl: "https://example.com",
    publisherLogo: "https://example.com/logo.png",
    reducedMobilityAccessible: "yes",
    remote: "no",
    schedule: "1 jour par semaine",
    snu: false,
    snuPlaces: 0,
    softSkills: ["Travail en équipe", "Communication"],
    statusComment: "Status comment",
    statusCommentHistoric: [],
    romeSkills: ["123456"],
    requirements: ["Pré-requis 1", "Pré-requis 2"],
    startAt: new Date(),
    statusCode: "ACCEPTED",
    tags: ["tag1", "tag2"],
    tasks: ["task1", "task2"],
    title: "Test Mission",
    type: MissionType.BENEVOLAT,
  };

  const missionData = { ...defaultData, ...data };
  if (data.addresses) {
    missionData.addresses = data.addresses;
  }

  const mission = new MissionModel(missionData);

  await mission.save();

  // Force date if provided with timestamps disabled
  if (data.updatedAt) {
    await MissionModel.updateOne({ _id: mission._id }, { $set: { updatedAt: data.updatedAt } }, { timestamps: false });
    mission.updatedAt = data.updatedAt;
  }
  return mission.toObject();
};

export const createTestImport = async (data: Partial<Import> = {}): Promise<Import> => {
  const defaultData = {
    name: "Test import",
    publisherId: "test-publisher-id",
    status: "SUCCESS",
    startedAt: new Date(),
    endedAt: new Date(),
    createdCount: 0,
    deletedCount: 0,
    updatedCount: 0,
    missionCount: 0,
    refusedCount: 0,
    error: null,
    failed: [],
  };
  const importData = { ...defaultData, ...data };
  const object = new ImportModel(importData);
  await object.save();
  return object.toObject() as Import;
};
