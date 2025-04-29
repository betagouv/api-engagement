import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../testApp';
import { 
  createTestPublisher, 
  createTestMission, 
  createTestPartner 
} from '../fixtures';
import PublisherModel from '../../src/models/publisher';
import request from 'supertest';

describe('MyOrganization API Integration Tests', () => {
  const app = createTestApp();
  let publisher: any;
  let apiKey: string;
  let mission: any;
  let partner1: any;
  let partner2: any;
  let orgId: string;

  beforeEach(async () => {
    publisher = await createTestPublisher();
    apiKey = publisher.apikey;
    orgId = publisher.organizationClientId || 'test-org-id';
    mission = await createTestMission(orgId, publisher._id.toString());
    partner1 = await createTestPartner(publisher._id.toString());
    partner2 = await createTestPartner(publisher._id.toString());
    await createTestPartner("other-publisher-id");
  });

  /**
   * GET /v0/myorganization/:organizationClientId
   * - should return 401 if not authenticated
   * - should return list of publishers for the organization with correct format
   */
  describe('GET /v0/myorganization/:organizationClientId', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get(`/v0/myorganization/${orgId}`);
      expect(response.status).toBe(401);
    });

    it('should return list of publishers for the organization with correct format', async () => {
      const response = await request(app)
        .get(`/v0/myorganization/${orgId}`)
        .set('x-api-key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Should have our two test partners related to publisher
      
      // Verify the structure of returned data matches the documentation
      const partner = response.body.data[0];
      expect(partner).toHaveProperty('_id');
      expect(partner).toHaveProperty('name');
      expect(partner).toHaveProperty('category');
      expect(partner).toHaveProperty('url');
      expect(partner).toHaveProperty('logo');
      expect(partner).toHaveProperty('description');
      expect(partner).toHaveProperty('widget');
      expect(partner).toHaveProperty('api');
      expect(partner).toHaveProperty('campaign');
      expect(partner).toHaveProperty('annonceur');
      expect(partner).toHaveProperty('excluded');
      expect(partner).toHaveProperty('clicks');
      
      expect(typeof partner.excluded).toBe('boolean');
      expect(typeof partner.clicks).toBe('number');
    });
  });


  /**
   * PUT /v0/myorganization/:organizationClientId
   * - should return 401 if not authenticated
   * - should update publisher exclusions based on publisherIds
   * - should remove exclusions when publisher is included
   * - should not overwrite excludedOrganization when receiving publisherId of a different publisher
   */
  describe('PUT /v0/myorganization/:organizationClientId', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .send({ publisherIds: [partner1._id.toString()] });
      
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set('x-api-key', apiKey)
        .send({ invalidField: 'value' }); // Missing required publisherIds
      
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });

    it('should update publisher exclusions based on publisherIds', async () => {
      // Include only partner1 (exclude partner2)
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set('x-api-key', apiKey)
        .send({ publisherIds: [partner1._id.toString()] });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify partner1 is not excluded
      const partner1Data = response.body.data.find((p: any) => p._id.toString() === partner1._id.toString());
      expect(partner1Data.excluded).toBe(false);
      
      // Verify partner2 is excluded
      const partner2Data = response.body.data.find((p: any) => p._id.toString() === partner2._id.toString());
      expect(partner2Data.excluded).toBe(true);
      
      // Verify database was updated correctly
      const updatedPartner2 = await PublisherModel.findById(partner2._id).lean();
      const exclusion = updatedPartner2?.excludedOrganizations.find(
        (o: any) => 
          o.organizationClientId === orgId && 
          o.publisherId === publisher._id.toString()
      );
      expect(exclusion).toBeDefined();
    });

    it('should remove exclusions when publisher is included', async () => {
      // First exclude both partners from DB
      await PublisherModel.findByIdAndUpdate(partner1._id, {
        $push: {
          excludedOrganizations: {
            publisherId: publisher._id.toString(),
            publisherName: publisher.name,
            organizationClientId: orgId,
            organizationName: publisher.organizationName,
          }
        }
      });
      await PublisherModel.findByIdAndUpdate(partner2._id, {
        $push: {
          excludedOrganizations: {
            publisherId: publisher._id.toString(),
            publisherName: publisher.name,
            organizationClientId: orgId,
            organizationName: 'Test Organization',
          }
        }
      });
      
      // Call endpoint to include both partners
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set('x-api-key', apiKey)
        .send({ publisherIds: [partner1._id.toString(), partner2._id.toString()] });
      
      expect(response.status).toBe(200);
      
      // Verify both partners are not excluded in the response
      const partner1Data = response.body.data.find((p: any) => p._id.toString() === partner1._id.toString());
      const partner2Data = response.body.data.find((p: any) => p._id.toString() === partner2._id.toString());
      expect(partner1Data.excluded).toBe(false);
      expect(partner2Data.excluded).toBe(false);
      
      // Verify database was updated correctly
      const updatedPartner = await PublisherModel.findById(partner1._id).lean();
      const exclusion = updatedPartner?.excludedOrganizations.find(
        (o: any) => 
          o.organizationClientId === orgId && 
          o.publisherId === publisher._id.toString()
      );
      expect(exclusion).toBeUndefined();
    });

    it('should not overwrite excludedOrganization when receiving publisherId of a different publisher', async () => {
      // Exclude new organization from different publisher
      const otherOrganizationClientId = 'other-org-' + Date.now().toString();
      const otherPublisherId = 'other-publisher-' + Date.now().toString();
      await PublisherModel.findByIdAndUpdate(partner1._id, {
        $push: {
          excludedOrganizations: {
            publisherId: otherPublisherId,
            publisherName: 'Other Publisher',
            organizationClientId: otherOrganizationClientId,
            organizationName: 'Other Organization',
          }
        }
      });
      
      // Include partner1 in the test organization
      const response = await request(app)
        .put(`/v0/myorganization/${orgId}`)
        .set('x-api-key', apiKey)
        .send({ publisherIds: [partner1._id.toString()] });
      
      expect(response.status).toBe(200);
      
      // Other organization should still be excluded
      const partnerAfter = await PublisherModel.findById(partner1._id).lean();
      const exclusionAfter = partnerAfter?.excludedOrganizations.find(
        (o: any) => o.organizationClientId === otherOrganizationClientId && o.publisherId === otherPublisherId
      );
      expect(exclusionAfter).toBeDefined();
      
      // Test organization should not be excluded
      const testExclusion = partnerAfter?.excludedOrganizations.find(
        (o: any) => o.organizationClientId === orgId && o.publisherId === publisher._id.toString()
      );
      expect(testExclusion).toBeUndefined();
    });

  });
});
