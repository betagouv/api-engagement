import { Document, Schema } from "mongoose";

// Action types for history entries
const HISTORY_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
} as const;

interface HistoryEntry {
  date: Date;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

interface HistoryOptions {
  historyField?: string;
  omit?: string[];
  metadata?: Record<string, any>;
  maxEntries?: number;
}

/**
 * Mongoose history plugin
 * Adds an __history field to the schema
 * with the following structure:
 * __history: [{ date: Date, state: { field1: value1, field2: value2, ... } }]
 *
 * Provides the following methods:
 * - getHistory(): Returns the full history of the document
 * - withHistoryContext(metadata: Record<string, any>): Returns a new model with the history context.
 * - bulkWrite(operations: any[]): Returns a new model with the history context.
 *
 * See example in each function documentation.
 */
export function historyPlugin<T extends Document>(schema: Schema, options: HistoryOptions = {}) {
  const defaultOptions: HistoryOptions = {
    historyField: "__history",
    omit: ["updatedAt", "createdAt", "__v", "__history"],
    metadata: {},
    maxEntries: 100,
  };

  const pluginOptions = { ...defaultOptions, ...options };
  const historyField = pluginOptions.historyField as string;
  const omitFields = pluginOptions.omit as string[];

  /**
   * Reset action metadata if present
   * @param originalMetadata Original metadata to restore if no action is present
   */
  const resetActionMetadata = (originalMetadata: Record<string, any> = {}) => {
    if (
      pluginOptions.metadata &&
      (pluginOptions.metadata.action === HISTORY_ACTIONS.CREATED ||
        pluginOptions.metadata.action === HISTORY_ACTIONS.UPDATED)
    ) {
      const { action, ...restMetadata } = pluginOptions.metadata;
      pluginOptions.metadata = restMetadata;
    } else {
      pluginOptions.metadata = originalMetadata;
    }
  };

  if (!schema.path(historyField)) {
    const historySchema = {
      [historyField]: [
        {
          date: { type: Date, default: Date.now },
          state: { type: Object, default: {} },
          metadata: { type: Object, default: {} },
        },
      ],
    };

    schema.add(historySchema);
  }

  /**
   * Pre save hook
   *
   * Called before saving the document
   *
   * Usage:
   * ```
   * await doc.save();
   * ```
   */
  schema.pre("save", function (next) {
    // Add type assertion for 'this'
    const doc = this as Document & { [key: string]: HistoryEntry[] };

    // Determine fields to track and their values
    let fieldsToTrack: string[] = [];
    const changedFields: Record<string, any> = {};
    let hasChanges = false;

    // Ensure metadata is always an object
    const currentMetadata = pluginOptions.metadata || {};

    if (doc.isNew) {
      // For new documents, track all fields
      const docObj = doc.toObject() || {};
      fieldsToTrack = Object.keys(docObj).filter(
        (path) => !omitFields.includes(path) && path !== historyField
      );

      // Add action metadata for creation
      pluginOptions.metadata = {
        ...currentMetadata,
        action: HISTORY_ACTIONS.CREATED,
      };
    } else {
      // For existing documents, only track modified fields
      const modifiedPaths = doc.modifiedPaths();
      fieldsToTrack = modifiedPaths.filter((path) => {
        return !omitFields.includes(path) && path !== historyField;
      });

      // Add action metadata for update
      pluginOptions.metadata = {
        ...currentMetadata,
        action: HISTORY_ACTIONS.UPDATED,
      };
    }

    // If no fields to track, skip
    if (fieldsToTrack.length === 0) {
      return next();
    }

    // Capture values for all tracked fields
    fieldsToTrack.forEach((path) => {
      if (doc.isNew || doc.isModified(path)) {
        changedFields[path] = doc.get(path);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      const historyEntry = {
        date: new Date(),
        state: changedFields,
        metadata: { ...pluginOptions.metadata },
      };

      if (!doc[historyField]) {
        doc[historyField] = [] as HistoryEntry[];
      }

      doc[historyField].push(historyEntry);

      if (doc[historyField].length > (pluginOptions.maxEntries as number)) {
        doc[historyField] = doc[historyField].slice(
          doc[historyField].length - (pluginOptions.maxEntries as number)
        );
      }

      resetActionMetadata(currentMetadata);
    }

    next();
  });

  /**
   * Get full history
   *
   * Usage:
   * ```
   * const history = await doc.getHistory();
   * ```
   */
  schema.methods.getHistory = function () {
    return this[historyField] || [];
  };

  /**
   * Returns a new model with the history context
   * Used to add metadata to the history
   *
   * Usage:
   * ```
   *  await MissionModel.withHistoryContext({
   *  userId: user._id,
   *  userName: user.name,
   *  reason: "Mise à jour manuelle"
   * }).save(mission);
   * ```
   */
  schema.statics.withHistoryContext = function (metadata: Record<string, any>) {
    const originalPluginMetadata = { ...pluginOptions.metadata };

    return {
      save: async (doc: any) => {
        pluginOptions.metadata = { ...originalPluginMetadata, ...metadata };

        const result = await doc.save();

        resetActionMetadata(originalPluginMetadata);

        return result;
      },

      /**
       * Bulk write with history tracking
       * Warning: as mongoose does not support hooks for bulkWrite, this method have to be used instead of bulkWrite
       * We'll find all affected documents and update their history, after calling Model.bulkWrite
       *
       * Usage:
       * ```
       * await MissionModel.withHistoryContext({
       *   userId: user._id,
       *   userName: user.name,
       *   reason: "Import automatique"
       * }).bulkWrite(operations);
       * ```
       */
      bulkWrite: async (operations: any[]) => {
        const Model = this;
        // Ensure metadata is always an object
        const currentMetadata = originalPluginMetadata || {};
        pluginOptions.metadata = { ...currentMetadata, ...metadata };

        // First, perform the bulkWrite operation
        const result = await Model.bulkWrite(operations);

        // Process history for inserted documents
        const insertOperations = operations.filter((op) => op.insertOne);
        if (insertOperations.length > 0) {
          const historyUpdates = [];

          // Add action metadata for creation
          const creationMetadata = {
            ...pluginOptions.metadata,
            action: HISTORY_ACTIONS.CREATED,
          };

          for (const op of insertOperations) {
            // Get the inserted document ID from the result
            const insertedId = op.insertOne.document._id;
            if (!insertedId) {
              continue;
            }

            // Find the newly inserted document
            const newDoc = await Model.findById(insertedId);
            if (!newDoc) {
              continue;
            }

            // Create history entry with all fields
            const initialState: Record<string, any> = {};
            const docObj = newDoc.toObject() || {};

            // Get all fields except those in omitFields
            Object.keys(docObj).forEach((path) => {
              if (!omitFields.includes(path) && path !== historyField) {
                initialState[path] = docObj[path];
              }
            });

            // Create history entry for new document
            const historyEntry = {
              date: new Date(),
              state: initialState,
              metadata: { ...creationMetadata },
            };

            historyUpdates.push({
              updateOne: {
                filter: { _id: insertedId },
                update: { $set: { [historyField]: [historyEntry] } },
              },
            });
          }

          // Execute a single bulkWrite for all new document history updates
          if (historyUpdates.length > 0) {
            await Model.bulkWrite(historyUpdates);
          }
        }

        // Then, process history for each updated document
        const updateOperations = operations.filter((op) => op.updateOne || op.updateMany);

        if (updateOperations.length > 0) {
          // Add action metadata for update
          const updateMetadata = {
            ...pluginOptions.metadata,
            action: HISTORY_ACTIONS.UPDATED,
          };

          // Collect all filters to find affected documents in a single query
          const filters = updateOperations.map((op) => {
            const operation = op.updateOne || op.updateMany;
            return operation.filter;
          });

          // Find all documents that were updated by any operation
          const docs = await Model.find({ $or: filters });

          if (docs.length > 0) {
            const historyUpdates = [];

            for (const doc of docs) {
              // Find the operation that affected this document
              const matchingOp = updateOperations.find((op) => {
                const operation = op.updateOne || op.updateMany;
                const filter = operation.filter;

                // Check if this document matches the filter
                return Object.keys(filter).every((key) => {
                  if (key === "_id") {
                    return doc._id.toString() === filter._id.toString();
                  }
                  return doc[key] === filter[key];
                });
              });

              if (matchingOp) {
                const operation = matchingOp.updateOne || matchingOp.updateMany;
                const update = operation.update;

                // Skip if there's no $set operation
                if (!update.$set) {
                  continue;
                }

                // Create history entry for this document
                const changedFields: Record<string, any> = {};
                let hasChanges = false;

                // Extract changed fields from the $set operation
                Object.keys(update.$set).forEach((path) => {
                  if (!omitFields.includes(path) && path !== historyField) {
                    // Check if the value has changed
                    if (JSON.stringify(doc[path]) !== JSON.stringify(update.$set[path])) {
                      changedFields[path] = update.$set[path];
                      hasChanges = true;
                    }
                  }
                });

                if (hasChanges) {
                  const historyEntry = {
                    date: new Date(),
                    state: changedFields,
                    metadata: { ...updateMetadata },
                  };

                  let history = doc[historyField] || [];
                  history.push(historyEntry);

                  if (history.length > (pluginOptions.maxEntries as number)) {
                    history = history.slice(history.length - (pluginOptions.maxEntries as number));
                  }

                  historyUpdates.push({
                    updateOne: {
                      filter: { _id: doc._id },
                      update: { $set: { [historyField]: history } },
                    },
                  });
                }
              }
            }

            // Execute a single bulkWrite for all history updates
            if (historyUpdates.length > 0) {
              await Model.bulkWrite(historyUpdates);
            }
          }
        }

        // Reset metadata to original state
        resetActionMetadata(originalPluginMetadata);

        return result;
      },
    };
  };

  /**
   * Utility function to track history for bulkWrite operations
   * Can be used directly if you don't need context metadata
   *
   * Usage:
   * ```
   * const operations = bulk.map(e => (e._id ? { updateOne: { filter: { _id: e._id }, update: { $set: e }, upsert: true } } : { insertOne: { document: e } }));
   * await MissionModel.bulkWriteWithHistory(operations);
   * ```
   */
  schema.statics.bulkWriteWithHistory = async function (operations: any[]) {
    return (this as any).withHistoryContext({}).bulkWrite(operations);
  };
}
