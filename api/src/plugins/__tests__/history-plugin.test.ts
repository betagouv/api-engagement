import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Schema } from 'mongoose';
import { historyPlugin } from '../history-plugin';

interface HistoryEntry {
  date: Date;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

class MockDocument {
  isNew = false;
  isModified = vi.fn();
  modifiedPaths = vi.fn();
  get = vi.fn();
  toObject = vi.fn();
  __history: HistoryEntry[] = [];

  constructor(initialData: Record<string, any> = {}) {
    Object.assign(this, initialData);
  }

  save(): Promise<MockDocument> {
    return Promise.resolve(this);
  }
}

class MockSchema {
  paths: Record<string, any> = {};
  methods: Record<string, any> = {};
  statics: Record<string, any> = {};
  pre = vi.fn();
  add = vi.fn();
  path = vi.fn();

  constructor() {
    this.path.mockImplementation((pathName: string) => {
      return this.paths[pathName];
    });
  }
}

describe('History Plugin', () => {
  let schema: MockSchema;
  let preHook: (next: () => void) => void;
  let doc: MockDocument;

  beforeEach(() => {
    vi.resetAllMocks();
    
    schema = new MockSchema();
    
    historyPlugin(schema as unknown as Schema, {
      historyField: '__history',
      omit: ['updatedAt', '__v', '__history'],
      maxEntries: 10
    });
    
    preHook = schema.pre.mock.calls.find(call => call[0] === 'save')?.[1];
    
    doc = new MockDocument({
      name: 'Test Document',
      description: 'Test Description',
      status: 'pending',
      updatedAt: new Date(),
      __v: 0
    });
  });

  it('should add __history field to schema if it does not exist', () => {
    expect(schema.add).toHaveBeenCalled();
    const addCall = schema.add.mock.calls[0][0];
    expect(addCall).toHaveProperty('__history');
  });

  it('should add methods to schema', () => {
    expect(schema.methods).toHaveProperty('getHistory');
    expect(schema.statics).toHaveProperty('withHistoryContext');
  });

  it('should not create history entry for new documents', () => {
    doc.isNew = true;
    
    const next = vi.fn();
    
    preHook.call(doc, next);
    
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(0);
  });

  it('should create history entry when document is updated', () => {
    doc.isNew = false;
    
    doc.modifiedPaths.mockReturnValue(['name', 'status']);
    doc.isModified.mockImplementation((path: string) => ['name', 'status'].includes(path));
    doc.get.mockImplementation((path: string) => {
      if (path === 'name') return 'Updated Name';
      if (path === 'status') return 'active';
      return null;
    });
    
    const next = vi.fn();
    
    preHook.call(doc, next);
    
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(1);
    expect(doc.__history[0].state).toHaveProperty('name', 'Updated Name');
    expect(doc.__history[0].state).toHaveProperty('status', 'active');
  });

  it('should ignore fields specified in omit option', () => {
    doc.isNew = false;
    
    doc.modifiedPaths.mockReturnValue(['name', 'updatedAt']);
    doc.isModified.mockImplementation((path: string) => ['name', 'updatedAt'].includes(path));
    doc.get.mockImplementation((path: string) => {
      if (path === 'name') return 'Updated Name';
      if (path === 'updatedAt') return new Date();
      return null;
    });
    
    const next = vi.fn();
    
    preHook.call(doc, next);
    
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(1);
    expect(doc.__history[0].state).toHaveProperty('name');
    expect(doc.__history[0].state).not.toHaveProperty('updatedAt');
  });

  it('should add metadata to history entry when using withHistoryContext', () => {
    doc.isNew = false;
    
    doc.modifiedPaths.mockReturnValue(['name']);
    doc.isModified.mockImplementation((path: string) => path === 'name');
    doc.get.mockImplementation((path: string) => {
      if (path === 'name') return 'Updated with Context';
      return null;
    });
    
    const withHistoryContext = schema.statics.withHistoryContext;
    
    const metadata = {
      reason: 'Testing withHistoryContext'
    };
    
    const contextualSave = withHistoryContext(metadata);
    
    const next = vi.fn();
    
    preHook.call(doc, next);
    
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(1);
    
    contextualSave.save(doc);
    
    preHook.call(doc, next);
    
    expect(doc.__history.length).toBe(2);
    expect(doc.__history[1].metadata).toHaveProperty('reason', 'Testing withHistoryContext');
  });

  it('should retrieve full history using getHistory', () => {
    const now = new Date();
    const pastDate1 = new Date(now.getTime() - 3000); // 3 seconds ago
    const pastDate2 = new Date(now.getTime() - 2000); // 2 seconds ago
    
    doc.__history = [
      {
        date: pastDate1,
        state: { name: 'First Update', status: 'in-progress', counter: 1 }
      },
      {
        date: pastDate2,
        state: { name: 'Second Update', counter: 2 }
      },
      {
        date: now,
        state: { name: 'Final Update', status: 'completed', counter: 3 }
      }
    ];
    
    doc.toObject.mockReturnValue({
      name: 'Final Update',
      status: 'completed',
      counter: 3,
      description: 'Test Description'
    });
    
    const getHistory = schema.methods.getHistory;
    const history = getHistory.call(doc);
    
    expect(history).toEqual(doc.__history);
  });

  it('should retrieve full history using getHistory', () => {
    doc.__history = [
      {
        date: new Date(),
        state: { name: 'First Update' }
      },
      {
        date: new Date(),
        state: { status: 'in-progress' }
      },
      {
        date: new Date(),
        state: { name: 'Second Update' }
      }
    ];
    
    const getHistory = schema.methods.getHistory;
    const history = getHistory.call(doc);
    expect(history).toEqual(doc.__history);
    expect(history.length).toBe(3);
  });

  it('should track history for bulkWrite operations', async () => {
    const mockModel = {
      bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 2 }),
      find: vi.fn(),
      withHistoryContext: schema.statics.withHistoryContext
    };

    const mockDoc1 = new MockDocument({
      _id: '123',
      name: 'Document 1',
      status: 'pending',
      counter: 5,
      __history: []
    });

    const mockDoc2 = new MockDocument({
      _id: '456',
      name: 'Document 2',
      status: 'active',
      counter: 10,
      __history: []
    });

    mockModel.find.mockResolvedValue([mockDoc1, mockDoc2]);

    const operations = [
      {
        updateOne: {
          filter: { _id: '123' },
          update: { $set: { name: 'Updated Document 1', counter: 5 } } // counter is unchanged
        }
      },
      {
        updateOne: {
          filter: { _id: '456' },
          update: { $set: { status: 'completed', counter: 15 } } // both fields changed
        }
      }
    ];

    const withContext = mockModel.withHistoryContext.call(mockModel, { reason: 'Test update' });
    await withContext.bulkWrite(operations);

    expect(mockModel.bulkWrite).toHaveBeenCalledWith(operations);

    expect(mockModel.find).toHaveBeenCalledWith({
      $or: [{ _id: '123' }, { _id: '456' }]
    });

    expect(mockDoc1.__history.length).toBe(1);
    expect(mockDoc1.__history[0].state).toHaveProperty('name', 'Updated Document 1');
    expect(mockDoc1.__history[0].state).not.toHaveProperty('counter'); // Unchanged field should not be in history
    expect(mockDoc1.__history[0].metadata).toHaveProperty('reason', 'Test update');

    expect(mockDoc2.__history.length).toBe(1);
    expect(mockDoc2.__history[0].state).toHaveProperty('status', 'completed');
    expect(mockDoc2.__history[0].state).toHaveProperty('counter', 15);
    expect(mockDoc2.__history[0].metadata).toHaveProperty('reason', 'Test update');
  });

  it('should not create history entries for unchanged fields in bulkWrite', async () => {
    const mockModel = {
      bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      find: vi.fn(),
      withHistoryContext: schema.statics.withHistoryContext
    };

    const mockDoc = new MockDocument({
      _id: '789',
      name: 'Test Document',
      description: 'Original description',
      status: 'pending',
      __history: []
    });

    mockModel.find.mockResolvedValue([mockDoc]);

    const operations = [
      {
        updateOne: {
          filter: { _id: '789' },
          update: { 
            $set: { 
              name: 'Test Document', // Same value as current
              description: 'Updated description', // Changed value
              status: 'pending' // Same value as current
            } 
          }
        }
      }
    ];

    const withContext = mockModel.withHistoryContext.call(mockModel, { reason: 'Test unchanged fields' });
    await withContext.bulkWrite(operations);

    expect(mockModel.bulkWrite).toHaveBeenCalledWith(operations);

    expect(mockModel.find).toHaveBeenCalledWith({
      $or: [{ _id: '789' }]
    });

    expect(mockDoc.__history.length).toBe(1);
    expect(mockDoc.__history[0].state).toHaveProperty('description', 'Updated description');
    expect(mockDoc.__history[0].state).not.toHaveProperty('name'); // Unchanged field
    expect(mockDoc.__history[0].state).not.toHaveProperty('status'); // Unchanged field
    expect(mockDoc.__history[0].metadata).toHaveProperty('reason', 'Test unchanged fields');
  });

  it('should handle bulkWrite with no changes', async () => {
    const mockModel = {
      bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
      find: vi.fn(),
      withHistoryContext: schema.statics.withHistoryContext
    };

    const mockDoc = new MockDocument({
      _id: '999',
      name: 'No Change Document',
      __history: []
    });

    mockModel.find.mockResolvedValue([mockDoc]);

    const operations = [
      {
        updateOne: {
          filter: { _id: '999' },
          update: { $set: { name: 'No Change Document' } } // Same value
        }
      }
    ];

    const withContext = mockModel.withHistoryContext.call(mockModel, { reason: 'Test no changes' });
    await withContext.bulkWrite(operations);

    expect(mockModel.bulkWrite).toHaveBeenCalledWith(operations);
    expect(mockModel.find).toHaveBeenCalled();
    expect(mockDoc.__history.length).toBe(0);
  });

  it('should limit history entries to maxEntries', () => {
    doc.isNew = false;
    
    doc.__history = Array.from({ length: 9 }, (_, i) => ({
      date: new Date(),
      state: { counter: i + 1 }
    }));
    
    doc.modifiedPaths.mockReturnValue(['counter']);
    doc.isModified.mockImplementation((path: string) => path === 'counter');
    doc.get.mockImplementation((path: string) => {
      if (path === 'counter') return 10;
      return null;
    });
    
    const next = vi.fn();
    
    preHook.call(doc, next);
    
    expect(doc.__history.length).toBe(10);
    
    doc.get.mockImplementation((path: string) => {
      if (path === 'counter') return 11;
      return null;
    });
    
    preHook.call(doc, next);
    
    expect(doc.__history.length).toBe(10);
    expect(doc.__history[0].state.counter).toBe(2);
    expect(doc.__history[9].state.counter).toBe(11);
  });
});
