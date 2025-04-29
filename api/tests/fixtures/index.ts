import mongoose from 'mongoose';
import { Publisher } from '../../src/types';
import PublisherModel from '../../src/models/publisher';
import MissionModel from '../../src/models/mission';

/**
 * Create a test publisher with random API key
 */
export const createTestPublisher = async (): Promise<Publisher> => {
  const apiKey = 'test-api-key-' + Date.now().toString();
  const organizationClientId = 'org-' + Date.now().toString();
  
  const publisher = new PublisherModel({
    name: 'Test Publisher',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    apikey: apiKey,
    organizationClientId,
    organizationName: 'Test Organization',
    role_annonceur_api: true,
    role_promoteur: true,
    publishers: [{
      publisherId: new mongoose.Types.ObjectId().toString(),
      publisherName: 'Test Publisher Name',
    }],
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
    organizationClientId,
    organizationName: 'Test Organization',
    clientId: 'client-' + Date.now().toString(),
    title: 'Test Mission',
    description: 'Test Mission Description',
    publisherId,
    publisherName: 'Test Publisher',
    lastSyncAt: new Date(),
    statusCode: 'ACCEPTED',
  });
  
  await mission.save();
  return mission.toObject();
};

/**
 * Create a test publisher partner
 */
export const createTestPartner = async (publisherId: string) => {
  const partner = new PublisherModel({
    name: 'Test Partner',
    email: `partner-${Date.now()}@example.com`,
    role_annonceur_widget: true,
    role_annonceur_api: true,
    role_annonceur_campagne: true,
    role_promoteur: true,
    category: 'Test Category',
    url: 'https://example.com',
    logo: 'https://example.com/logo.png',
    description: 'Test partner description',
    publishers: [{
      publisherId,
      publisherName: 'Test Publisher Name',
    }],
    excludedOrganizations: [],
  });
  
  await partner.save();
  return partner.toObject();
};
