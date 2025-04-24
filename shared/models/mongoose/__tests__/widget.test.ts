import { describe, it, expect } from 'vitest';
import { WidgetModel } from '../widget';
import { Widget } from '../../../types';
import { setupMongoDBForTesting } from './helpers/mongodb';

describe('Widget Model', () => {
  setupMongoDBForTesting([WidgetModel]);

  it('should create & save widget successfully', async () => {
    const widgetData: Partial<Widget> = {
      name: 'Test Widget',
      type: 'benevolat',
      fromPublisherId: 'publisher123',
      fromPublisherName: 'Test Publisher',
      active: true,
      deleted: false,
    };
    
    const validWidget = new WidgetModel(widgetData);
    const savedWidget = await validWidget.save();
    
    expect(savedWidget._id).toBeDefined();
    expect(savedWidget.name).toBe(widgetData.name);
    expect(savedWidget.type).toBe(widgetData.type);
    expect(savedWidget.fromPublisherId).toBe(widgetData.fromPublisherId);
    expect(savedWidget.fromPublisherName).toBe(widgetData.fromPublisherName);
    expect(savedWidget.active).toBe(widgetData.active);
    expect(savedWidget.deleted).toBe(widgetData.deleted);
    
    expect(savedWidget.createdAt).toBeDefined();
    expect(savedWidget.updatedAt).toBeDefined();
  });

  it('should fail when required field is missing', async () => {
    const widgetWithoutRequiredField = new WidgetModel({
      type: 'benevolat',
      fromPublisherId: 'publisher123',
    });
    
    await expect(widgetWithoutRequiredField.save()).rejects.toThrow();
  });

  it('should fail when type is invalid', async () => {
    const widgetWithInvalidType = new WidgetModel({
      name: 'Test Widget',
      type: 'invalid-type',
      fromPublisherId: 'publisher123',
      fromPublisherName: 'Test Publisher',
    });
    
    await expect(widgetWithInvalidType.save()).rejects.toThrow();
  });

  it('should find widgets by fromPublisherId', async () => {
    const widget1 = new WidgetModel({
      name: 'Widget 1',
      type: 'benevolat',
      fromPublisherId: 'publisher123',
      fromPublisherName: 'Test Publisher',
    });
    
    const widget2 = new WidgetModel({
      name: 'Widget 2',
      type: 'benevolat',
      fromPublisherId: 'publisher123',
      fromPublisherName: 'Test Publisher',
    });
    
    const widget3 = new WidgetModel({
      name: 'Widget 3',
      type: 'benevolat',
      fromPublisherId: 'publisher999',
      fromPublisherName: 'Different Publisher',
    });
    
    await widget1.save();
    await widget2.save();
    await widget3.save();
    
    const foundWidgets = await WidgetModel.find({ fromPublisherId: 'publisher123' });
    
    expect(foundWidgets.length).toBe(2);
    expect(foundWidgets[0].name).toBe('Widget 1');
    expect(foundWidgets[1].name).toBe('Widget 2');
  });
});
