import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Schema } from 'mongoose';
import { historyPlugin } from '../history-plugin';

interface HistoryEntry {
  date: Date;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

// Mock document class to simulate mongoose document behavior
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
    // Simulate mongoose save method
    return Promise.resolve(this);
  }
}

// Mock schema class to simulate mongoose schema behavior
class MockSchema {
  paths: Record<string, any> = {};
  methods: Record<string, any> = {};
  statics: Record<string, any> = {};
  pre = vi.fn();
  add = vi.fn();
  path = vi.fn();

  constructor() {
    // Initialize path method to check if a path exists
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
    // Reset mocks
    vi.resetAllMocks();
    
    // Create a new schema mock
    schema = new MockSchema();
    
    // Apply the history plugin
    historyPlugin(schema as unknown as Schema, {
      historyField: '__history',
      omit: ['updatedAt', '__v', '__history'],
      maxEntries: 10
    });
    
    // Capture the pre-save hook
    preHook = schema.pre.mock.calls.find(call => call[0] === 'save')?.[1];
    
    // Create a document mock
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
    expect(schema.methods).toHaveProperty('getStateAt');
    expect(schema.statics).toHaveProperty('withHistoryContext');
  });

  it('should not create history entry for new documents', () => {
    // Setup document as new
    doc.isNew = true;
    
    // Mock next function
    const next = vi.fn();
    
    // Call the pre-save hook
    preHook.call(doc, next);
    
    // Verify next was called without adding history
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(0);
  });

  it('should create history entry when document is updated', () => {
    // Setup document as existing (not new)
    doc.isNew = false;
    
    // Setup modified paths
    doc.modifiedPaths.mockReturnValue(['name', 'status']);
    doc.isModified.mockImplementation((path: string) => ['name', 'status'].includes(path));
    doc.get.mockImplementation((path: string) => {
      if (path === 'name') return 'Updated Name';
      if (path === 'status') return 'active';
      return null;
    });
    
    // Mock next function
    const next = vi.fn();
    
    // Call the pre-save hook
    preHook.call(doc, next);
    
    // Verify history entry was created
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(1);
    expect(doc.__history[0].state).toHaveProperty('name', 'Updated Name');
    expect(doc.__history[0].state).toHaveProperty('status', 'active');
  });

  it('should ignore fields specified in omit option', () => {
    // Setup document as existing (not new)
    doc.isNew = false;
    
    // Setup modified paths including omitted field
    doc.modifiedPaths.mockReturnValue(['name', 'updatedAt']);
    doc.isModified.mockImplementation((path: string) => ['name', 'updatedAt'].includes(path));
    doc.get.mockImplementation((path: string) => {
      if (path === 'name') return 'Updated Name';
      if (path === 'updatedAt') return new Date();
      return null;
    });
    
    // Mock next function
    const next = vi.fn();
    
    // Call the pre-save hook
    preHook.call(doc, next);
    
    // Verify history entry was created but doesn't include omitted fields
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(1);
    expect(doc.__history[0].state).toHaveProperty('name');
    expect(doc.__history[0].state).not.toHaveProperty('updatedAt');
  });

  it('should add metadata to history entry when using withHistoryContext', () => {
    // Setup document as existing (not new)
    doc.isNew = false;
    
    // Setup modified paths
    doc.modifiedPaths.mockReturnValue(['name']);
    doc.isModified.mockImplementation((path: string) => path === 'name');
    doc.get.mockImplementation((path: string) => {
      if (path === 'name') return 'Updated with Context';
      return null;
    });
    
    // Get the withHistoryContext method
    const withHistoryContext = schema.statics.withHistoryContext;
    
    // Create metadata
    const metadata = {
      userId: '12345',
      userName: 'Test User',
      reason: 'Testing withHistoryContext'
    };
    
    // Call withHistoryContext
    const contextualSave = withHistoryContext(metadata);
    
    // Mock next function
    const next = vi.fn();
    
    // Call the pre-save hook with metadata context
    preHook.call(doc, next);
    
    // Verify history entry includes metadata
    expect(next).toHaveBeenCalled();
    expect(doc.__history.length).toBe(1);
    
    // Now simulate the save with context
    contextualSave.save(doc);
    
    // Call the pre-save hook again to create an entry with metadata
    preHook.call(doc, next);
    
    // The second entry should have metadata
    expect(doc.__history.length).toBe(2);
    expect(doc.__history[1].metadata).toHaveProperty('userId', '12345');
    expect(doc.__history[1].metadata).toHaveProperty('userName', 'Test User');
    expect(doc.__history[1].metadata).toHaveProperty('reason', 'Testing withHistoryContext');
  });

  it('should retrieve document state at a specific date using getStateAt', () => {
    // Setup document with history
    const now = new Date();
    const pastDate1 = new Date(now.getTime() - 3000); // 3 seconds ago
    const pastDate2 = new Date(now.getTime() - 2000); // 2 seconds ago
    
    // Important: The order of history entries matters for the test
    // We need to ensure they're in chronological order (oldest first)
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
    
    // Mock toObject to return current state
    doc.toObject.mockReturnValue({
      name: 'Final Update',
      status: 'completed',
      counter: 3,
      description: 'Test Description'
    });
    
    // Call getStateAt for the first update date
    const stateAtFirstUpdate = schema.methods.getStateAt.call(doc, pastDate1);
    
    // Only the first history entry should be applied
    expect(stateAtFirstUpdate).toHaveProperty('name', 'First Update');
    expect(stateAtFirstUpdate).toHaveProperty('status', 'in-progress');
    expect(stateAtFirstUpdate).toHaveProperty('counter', 1);
    expect(stateAtFirstUpdate).toHaveProperty('description', 'Test Description');
    
    // Call getStateAt for the second update date
    const stateAtSecondUpdate = schema.methods.getStateAt.call(doc, pastDate2);
    
    // The first two history entries should be applied, with the second one overriding
    // properties from the first one when they overlap
    expect(stateAtSecondUpdate).toHaveProperty('name', 'Second Update');
    expect(stateAtSecondUpdate).toHaveProperty('status', 'in-progress'); // From first update, not overridden
    expect(stateAtSecondUpdate).toHaveProperty('counter', 2); // Overridden by second update
    expect(stateAtSecondUpdate).toHaveProperty('description', 'Test Description');
  });

  it('should retrieve full history using getHistory', () => {
    // Setup document with history
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
    
    // Get the getHistory method
    const getHistory = schema.methods.getHistory;
    
    // Call getHistory
    const history = getHistory.call(doc);
    
    // Verify history
    expect(history).toEqual(doc.__history);
    expect(history.length).toBe(3);
  });

  it('should limit history entries to maxEntries', () => {
    // Setup document as existing (not new)
    doc.isNew = false;
    
    // Create more entries than maxEntries
    doc.__history = Array.from({ length: 9 }, (_, i) => ({
      date: new Date(),
      state: { counter: i + 1 }
    }));
    
    // Setup for one more modification
    doc.modifiedPaths.mockReturnValue(['counter']);
    doc.isModified.mockImplementation((path: string) => path === 'counter');
    doc.get.mockImplementation((path: string) => {
      if (path === 'counter') return 10;
      return null;
    });
    
    // Mock next function
    const next = vi.fn();
    
    // Call the pre-save hook to add the 10th entry
    preHook.call(doc, next);
    
    // Verify we have 10 entries
    expect(doc.__history.length).toBe(10);
    
    // Add one more entry to exceed maxEntries
    doc.get.mockImplementation((path: string) => {
      if (path === 'counter') return 11;
      return null;
    });
    
    // Call the pre-save hook again
    preHook.call(doc, next);
    
    // Verify we still have 10 entries (the oldest was removed)
    expect(doc.__history.length).toBe(10);
    // The first entry should now have counter: 2 (counter: 1 was removed)
    expect(doc.__history[0].state.counter).toBe(2);
    // The last entry should have counter: 11
    expect(doc.__history[9].state.counter).toBe(11);
  });
});
