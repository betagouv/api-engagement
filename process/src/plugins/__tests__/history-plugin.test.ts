import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Document, Schema } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { HISTORY_ACTIONS, HistoryEntry, historyPlugin } from "../history-plugin";

// MongoDB Memory Server setup
// Note: This configuration could be extracted to a separate setup.ts file
// when more tests will use MongoMemoryServer
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Define interfaces for our test models
interface TestDocument extends Document {
  name: string;
  description?: string;
  status?: string;
  tags?: string[];
  counter?: number;
  updatedAt?: Date;
  __history?: HistoryEntry[];
  getHistory: () => HistoryEntry[];
}

interface TestModel extends mongoose.Model<TestDocument> {
  withHistoryContext: (metadata: Record<string, any>) => {
    save: (doc: TestDocument) => Promise<TestDocument>;
    bulkWrite: (operations: any[]) => Promise<any>;
  };
  bulkWriteWithHistory: (operations: any[]) => Promise<any>;
}

describe("History Plugin Integration Tests", () => {
  let TestModel: TestModel;

  beforeEach(async () => {
    // Create a new schema and model for each test
    const testSchema = new Schema(
      {
        name: { type: String, required: true },
        description: String,
        status: String,
        tags: [String],
        counter: Number,
        updatedAt: { type: Date, default: Date.now },
      },
      { timestamps: true }
    );

    // Apply the history plugin
    testSchema.plugin(historyPlugin, {
      historyField: "__history",
      omit: ["updatedAt", "__v", "__history", "createdAt"],
      maxEntries: 10,
    });

    // Create a new model with the schema
    // Use a unique model name for each test to avoid OverwriteModelError
    const modelName = `Test${Date.now()}`;
    TestModel = mongoose.model<TestDocument, TestModel>(modelName, testSchema);
  });

  it("should create history entry with 'created' action for new documents", async () => {
    const doc = new TestModel({
      name: "New Document",
      description: "Initial Description",
      status: "draft",
      tags: ["test", "new"],
      counter: 1,
    });

    await doc.save();
    const history = doc.getHistory();

    // Verify history was created
    expect(history.length).toBe(1);

    // Verify all fields (except omitted ones) are in the state
    expect(history[0].state).toHaveProperty("name", "New Document");
    expect(history[0].state).toHaveProperty("description", "Initial Description");
    expect(history[0].state).toHaveProperty("status", "draft");
    expect(history[0].state).toHaveProperty("tags");
    expect(history[0].state).toHaveProperty("counter", 1);

    // Verify omitted fields are not in the state
    expect(history[0].state).not.toHaveProperty("updatedAt");
    expect(history[0].state).not.toHaveProperty("__v");
    expect(history[0].state).not.toHaveProperty("__history");
    expect(history[0].state).not.toHaveProperty("createdAt");

    // Verify action metadata
    expect(history[0].metadata).toHaveProperty("action", HISTORY_ACTIONS.CREATED);
  });

  it("should create history entry with 'updated' action when document is updated", async () => {
    const doc = new TestModel({
      name: "Original Name",
      status: "pending",
    });
    await doc.save();

    // Update the document
    doc.name = "Updated Name";
    doc.status = "active";
    await doc.save();

    const history = doc.getHistory();

    // Verify history entries
    expect(history.length).toBe(2);

    // First entry should be the creation
    expect(history[0].metadata).toHaveProperty("action", HISTORY_ACTIONS.CREATED);
    expect(history[0].state).toHaveProperty("name", "Original Name");
    expect(history[0].state).toHaveProperty("status", "pending");

    // Second entry should be the update
    expect(history[1].metadata).toHaveProperty("action", HISTORY_ACTIONS.UPDATED);
    expect(history[1].state).toHaveProperty("name", "Updated Name");
    expect(history[1].state).toHaveProperty("status", "active");
  });

  it("should add metadata to history entry when using withHistoryContext", async () => {
    const doc = new TestModel({
      name: "Test Document",
      status: "pending",
    });
    await doc.save();

    // Use withHistoryContext to add metadata
    doc.name = "Updated with Context";
    await TestModel.withHistoryContext({
      reason: "Testing withHistoryContext",
      userId: "user-123",
    }).save(doc);

    const history = doc.getHistory();

    // Verify history entries
    expect(history.length).toBe(2);

    // Second entry should have the metadata
    expect(history[1].metadata).toHaveProperty("reason", "Testing withHistoryContext");
    expect(history[1].metadata).toHaveProperty("userId", "user-123");
    expect(history[1].metadata).toHaveProperty("action", HISTORY_ACTIONS.UPDATED);
  });

  it("should track history for bulkWrite operations", async () => {
    const doc1 = await TestModel.create({
      _id: new mongoose.Types.ObjectId(),
      name: "Document 1",
      status: "pending",
      counter: 5,
    });

    const doc2 = await TestModel.create({
      _id: new mongoose.Types.ObjectId(),
      name: "Document 2",
      status: "active",
      counter: 10,
    });

    // Prepare bulk operations
    const operations = [
      {
        updateOne: {
          filter: { _id: doc1._id },
          update: { $set: { name: "Updated Document 1" } },
        },
      },
      {
        updateOne: {
          filter: { _id: doc2._id },
          update: { $set: { status: "completed", counter: 15 } },
        },
      },
    ];

    await TestModel.withHistoryContext({
      reason: "Test bulk update",
    }).bulkWrite(operations);

    const updatedDoc1 = await TestModel.findById(doc1._id);
    const updatedDoc2 = await TestModel.findById(doc2._id);

    const history1 = updatedDoc1!.getHistory();
    expect(history1.length).toBe(2);
    expect(history1[1].state).toHaveProperty("name", "Updated Document 1");
    expect(history1[1].state).not.toHaveProperty("counter"); // Unchanged field
    expect(history1[1].metadata).toHaveProperty("reason", "Test bulk update");

    const history2 = updatedDoc2!.getHistory();
    expect(history2.length).toBe(2);
    expect(history2[1].state).toHaveProperty("status", "completed");
    expect(history2[1].state).toHaveProperty("counter", 15);
    expect(history2[1].metadata).toHaveProperty("reason", "Test bulk update");
  });

  it("should create history entry with 'created' action for bulkWrite insertOne operations", async () => {
    // Prepare bulk insert operation
    const newDocId = new mongoose.Types.ObjectId();
    const operations = [
      {
        insertOne: {
          document: {
            _id: newDocId,
            name: "New Bulk Document",
            description: "Bulk Insert Description",
            status: "draft",
            tags: ["test", "bulk"],
            counter: 5,
          },
        },
      },
    ];

    await TestModel.withHistoryContext({
      reason: "Test bulk insert",
    }).bulkWrite(operations);

    // Verify document was inserted
    const insertedDoc = await TestModel.findById(newDocId);
    expect(insertedDoc).not.toBeNull();
    expect(insertedDoc!.name).toBe("New Bulk Document");

    const history = insertedDoc!.getHistory();
    expect(history.length).toBe(1);

    // Verify all fields are in the state
    expect(history[0].state).toHaveProperty("name", "New Bulk Document");
    expect(history[0].state).toHaveProperty("description", "Bulk Insert Description");
    expect(history[0].state).toHaveProperty("status", "draft");
    expect(history[0].state).toHaveProperty("tags");
    expect(history[0].state).toHaveProperty("counter", 5);

    // Verify action metadata
    expect(history[0].metadata).toHaveProperty("action", HISTORY_ACTIONS.CREATED);
    expect(history[0].metadata).toHaveProperty("reason", "Test bulk insert");
  });

  it("should limit history entries to maxEntries", async () => {
    const doc = await TestModel.create({
      name: "Test Document",
      counter: 0,
    });

    // Update the document 11 times (1 create + 11 updates = 12 entries)
    // But maxEntries is set to 10, so we should only keep the 10 most recent
    for (let i = 1; i <= 11; i++) {
      doc.counter = i;
      await doc.save();
    }

    const history = doc.getHistory();

    // Verify history length is limited to maxEntries
    expect(history.length).toBe(10);

    // Verify the oldest entries were removed
    // The first entry should now be the update with counter=2
    expect(history[0].state).toHaveProperty("counter", 2);

    // The last entry should be the update with counter=11
    expect(history[9].state).toHaveProperty("counter", 11);
  });
});
