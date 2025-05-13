import { Document, Schema } from "mongoose";

export const HISTORY_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
} as const;

type HistoryAction = (typeof HISTORY_ACTIONS)[keyof typeof HISTORY_ACTIONS];

export interface HistoryEntry {
  date: Date;
  state: Record<string, any>;
  metadata?: {
    action: HistoryAction;
    [key: string]: any;
  };
}

export interface HistoryOptions {
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
    } else {
      // For existing documents, only track modified fields
      const modifiedPaths = doc.modifiedPaths();
      fieldsToTrack = modifiedPaths.filter((path) => {
        return !omitFields.includes(path) && path !== historyField;
      });
    }

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
        metadata: {
          action: doc.isNew ? HISTORY_ACTIONS.CREATED : HISTORY_ACTIONS.UPDATED,
          ...currentMetadata,
        },
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
        const currentMetadata = originalPluginMetadata || {};
        pluginOptions.metadata = { ...currentMetadata, ...metadata };

        // Get all operations that will update documents before bulkWrite
        const operationsToUpdate = operations.filter((op) => op.updateOne || op.updateMany);
        let docsBeforeUpdate = [];

        if (operationsToUpdate.length > 0) {
          const filters = operationsToUpdate.map((op) => {
            const operation = op.updateOne || op.updateMany;
            return operation.filter;
          });

          docsBeforeUpdate = await Model.find({ $or: filters });
        }

        const result = await Model.bulkWrite(operations);

        const createHistoryEntry = (state: Record<string, any>, action: HistoryAction) => ({
          date: new Date(),
          state,
          metadata: {
            ...pluginOptions.metadata,
            action,
          },
        });

        const filterFields = (obj: Record<string, any>): Record<string, any> => {
          const filteredState: Record<string, any> = {};
          Object.keys(obj).forEach((path) => {
            if (!omitFields.includes(path) && path !== historyField) {
              filteredState[path] = obj[path];
            }
          });
          return filteredState;
        };

        const insertOperations = operations.filter((op) => op.insertOne);
        if (insertOperations.length > 0) {
          const historyUpdates = [];

          for (const op of insertOperations) {
            const insertedId = op.insertOne.document._id;
            if (!insertedId) {
              continue;
            }

            const newDoc = await Model.findById(insertedId);
            if (!newDoc) {
              continue;
            }

            const docObj = newDoc.toObject() || {};
            const initialState = filterFields(docObj);

            if (Object.keys(initialState).length === 0) {
              continue;
            }

            const historyEntry = createHistoryEntry(initialState, HISTORY_ACTIONS.CREATED);

            historyUpdates.push({
              updateOne: {
                filter: { _id: insertedId },
                update: { $set: { [historyField]: [historyEntry] } },
              },
            });
          }

          if (historyUpdates.length > 0) {
            await Model.bulkWrite(historyUpdates);
          }
        }

        if (operationsToUpdate.length > 0) {
          const filters = operationsToUpdate.map((op) => {
            const operation = op.updateOne || op.updateMany;
            return operation.filter;
          });

          const updatedDocs = await Model.find({ $or: filters });
          if (updatedDocs.length === 0) {
            resetActionMetadata(originalPluginMetadata);
            return result;
          }

          const historyUpdates = [];

          for (const updatedDoc of updatedDocs) {
            const originalDoc = docsBeforeUpdate.find(
              (doc: any) => doc._id && doc._id.toString() === updatedDoc._id.toString()
            );

            if (!originalDoc) {
              continue;
            }

            const matchingOp = operationsToUpdate.find((op) => {
              const operation = op.updateOne || op.updateMany;
              const filter = operation.filter;

              return Object.keys(filter).every((key) => {
                if (key === "_id") {
                  return updatedDoc._id.toString() === filter._id.toString();
                }
                return updatedDoc[key] === filter[key];
              });
            });

            if (!matchingOp) {
              continue;
            }

            const operation = matchingOp.updateOne || matchingOp.updateMany;
            const update = operation.update;
            if (!update.$set) {
              continue;
            }

            const changedFields: Record<string, any> = {};
            let hasChanges = false;

            Object.keys(update.$set).forEach((path) => {
              if (!omitFields.includes(path) && path !== historyField) {
                if (JSON.stringify(originalDoc[path]) !== JSON.stringify(update.$set[path])) {
                  changedFields[path] = update.$set[path];
                  hasChanges = true;
                }
              }
            });

            if (!hasChanges) {
              continue;
            }

            const historyEntry = createHistoryEntry(changedFields, HISTORY_ACTIONS.UPDATED);

            let history = Array.isArray(updatedDoc[historyField])
              ? [...updatedDoc[historyField]]
              : [];

            history.push(historyEntry);

            if (history.length > (pluginOptions.maxEntries as number)) {
              history = history.slice(history.length - (pluginOptions.maxEntries as number));
            }

            historyUpdates.push({
              updateOne: {
                filter: { _id: updatedDoc._id },
                update: { $set: { [historyField]: history } },
              },
            });
          }

          if (historyUpdates.length > 0) {
            await Model.bulkWrite(historyUpdates);
          }
        }

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
