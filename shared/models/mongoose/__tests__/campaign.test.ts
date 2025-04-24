import { describe, it, expect } from 'vitest';
import { CampaignModel } from '../campaign';
import { Campaign } from '../../../types';
import { setupMongoDBForTesting } from './helpers/mongodb';

describe('Campaign Model', () => {
  setupMongoDBForTesting([CampaignModel]);

  it('should create & save campaign successfully', async () => {
    const campaignData: Partial<Campaign> = {
      name: 'Test Campaign',
      type: 'banniere/publicité',
      url: 'https://example.com/campaign',
      fromPublisherId: 'publisher123',
      fromPublisherName: 'Test Publisher',
      toPublisherId: 'publisher456',
      toPublisherName: 'Target Publisher',
      active: true,
    };
    
    const validCampaign = new CampaignModel(campaignData);
    const savedCampaign = await validCampaign.save();
    
    expect(savedCampaign._id).toBeDefined();
    expect(savedCampaign.name).toBe(campaignData.name);
    expect(savedCampaign.type).toBe(campaignData.type);
    expect(savedCampaign.url).toBe(campaignData.url);
    expect(savedCampaign.fromPublisherId).toBe(campaignData.fromPublisherId);
    expect(savedCampaign.fromPublisherName).toBe(campaignData.fromPublisherName);
    expect(savedCampaign.toPublisherId).toBe(campaignData.toPublisherId);
    expect(savedCampaign.toPublisherName).toBe(campaignData.toPublisherName);
    expect(savedCampaign.active).toBe(campaignData.active);
    
    expect(savedCampaign.createdAt).toBeDefined();
    expect(savedCampaign.updatedAt).toBeDefined();
  });

  it('should fail when required field is missing', async () => {
    const campaignWithoutRequiredField = new CampaignModel({
      type: 'banniere/publicité',
      url: 'https://example.com/campaign',
      fromPublisherId: 'publisher123',
      toPublisherId: 'publisher456',
    });
    
    await expect(campaignWithoutRequiredField.save()).rejects.toThrow();
  });

  it('should fail when type is invalid', async () => {
    const campaignWithInvalidType = new CampaignModel({
      name: 'Test Campaign',
      type: 'invalid-type',
      url: 'https://example.com/campaign',
      fromPublisherId: 'publisher123',
      toPublisherId: 'publisher456',
    });
    
    await expect(campaignWithInvalidType.save()).rejects.toThrow();
  });

  it('should fail when trying to create a duplicate campaign with same name and fromPublisherId', async () => {
    const campaign1 = new CampaignModel({
      name: 'Duplicate Campaign',
      type: 'banniere/publicité',
      url: 'https://example.com/campaign1',
      fromPublisherId: 'publisher123',
      toPublisherId: 'publisher456',
    });
    await campaign1.save();
    
    const campaign2 = new CampaignModel({
      name: 'Duplicate Campaign',
      type: 'mailing',
      url: 'https://example.com/campaign2',
      fromPublisherId: 'publisher123',
      toPublisherId: 'publisher789',
    });
    
    await expect(campaign2.save()).rejects.toThrow();
  });

  it('should find campaigns by fromPublisherId', async () => {
    const campaign1 = new CampaignModel({
      name: 'Campaign 1',
      type: 'banniere/publicité',
      url: 'https://example.com/campaign1',
      fromPublisherId: 'publisher123',
      toPublisherId: 'publisher456',
    });
    
    const campaign2 = new CampaignModel({
      name: 'Campaign 2',
      type: 'mailing',
      url: 'https://example.com/campaign2',
      fromPublisherId: 'publisher123',
      toPublisherId: 'publisher789',
    });
    
    const campaign3 = new CampaignModel({
      name: 'Campaign 3',
      type: 'tuile/bouton',
      url: 'https://example.com/campaign3',
      fromPublisherId: 'publisher999',
      toPublisherId: 'publisher456',
    });
    
    await campaign1.save();
    await campaign2.save();
    await campaign3.save();
    
    const foundCampaigns = await CampaignModel.find({ fromPublisherId: 'publisher123' });
    
    expect(foundCampaigns.length).toBe(2);
    expect(foundCampaigns[0].name).toBe('Campaign 1');
    expect(foundCampaigns[1].name).toBe('Campaign 2');
  });
});
