import { Schema, Document, Model } from "mongoose";

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
 * - getStateAt(date: Date): Returns the state of the document at a specific date
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
    maxEntries: 100
  };

  const pluginOptions = { ...defaultOptions, ...options };
  const historyField = pluginOptions.historyField as string;
  const omitFields = pluginOptions.omit as string[];

  if (!schema.path(historyField)) {
    const historySchema = {
      [historyField]: [{
        date: { type: Date, default: Date.now },
        state: { type: Object, default: {} },
        metadata: { type: Object, default: {} }
      }]
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
  schema.pre("save", function(next) {
    // Ignore new documents 
    if (this.isNew) return next();
    
    const changedFields: Record<string, any> = {};
    let hasChanges = false;
    
    const modifiedPaths = this.modifiedPaths();    
    const fieldsToTrack = modifiedPaths.filter(path => {
      return !omitFields.includes(path) && path !== historyField;
    });
    
    if (fieldsToTrack.length === 0) return next();
    
    fieldsToTrack.forEach(path => {
      if (this.isModified(path)) {
        changedFields[path] = this.get(path);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      const historyEntry = {
        date: new Date(),
        state: changedFields,
        metadata: { ...pluginOptions.metadata }
      };
      
      if (!this[historyField]) {
        this[historyField] = [];
      }
      
      this[historyField].push(historyEntry);
      
      if (this[historyField].length > (pluginOptions.maxEntries as number)) {
        this[historyField] = this[historyField].slice(this[historyField].length - (pluginOptions.maxEntries as number));
      }
    }
    
    next();
  });

  /**
   * Returns the state of the document at a specific date
   * 
   * Usage:
   * ```
   * const state = await doc.getStateAt(new Date('2023-01-01'));
   * ```
   */
  schema.methods.getStateAt = function(date: Date) {
    // Return current state if no history exists
    if (!this[historyField] || this[historyField].length === 0) {
      return this.toObject();
    }
    
    // Get current state without history field
    const currentState = this.toObject();
    delete currentState[historyField];
    
    const historyEntries = [...this[historyField]];
    
    // Identify fields that were modified after the specified date
    const modifiedFields = historyEntries
      .filter((entry: any) => new Date(entry.date) > date)
      .reduce((fields: Set<string>, entry: any) => {
        Object.keys(entry.state).forEach(key => fields.add(key));
        return fields;
      }, new Set<string>());
    
    // For each modified field, find its value at the specified date
    return Array.from(modifiedFields).reduce((stateAtDate: Record<string, any>, field: string) => {
      // Find the most recent history entry for this field before or at the specified date
      const lastEntry = [...historyEntries]
        .filter((entry: any) => new Date(entry.date) <= date && field in entry.state)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (lastEntry) {
        // Use the historical value if found
        stateAtDate[field] = lastEntry.state[field];
      } else {
        // Remove field if it didn't exist at the specified date
        delete stateAtDate[field];
      }
      
      return stateAtDate;
    }, { ...currentState });
  };

  /**
   * Get full history
   * 
   * Usage:
   * ```
   * const history = await doc.getHistory();
   * ```
   */
  schema.methods.getHistory = function() {
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
  schema.statics.withHistoryContext = function(metadata: Record<string, any>) {
    const originalPluginMetadata = { ...pluginOptions.metadata };
    
    return {
      save: async (doc: any) => {
        pluginOptions.metadata = { ...originalPluginMetadata, ...metadata };
        
        const result = await doc.save();
        
        pluginOptions.metadata = originalPluginMetadata;
        
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
        pluginOptions.metadata = { ...originalPluginMetadata, ...metadata };
        
        // First, perform the bulkWrite operation
        const result = await Model.bulkWrite(operations);
        
        // Then, process history for each updated document
        const updateOperations = operations.filter(op => op.updateOne || op.updateMany);
        
        if (updateOperations.length > 0) {
          // Collect all filters to find affected documents in a single query
          const filters = updateOperations.map(op => {
            const operation = op.updateOne || op.updateMany;
            return operation.filter;
          });
          
          // Find all documents that were updated by any operation
          const docs = await Model.find({ $or: filters });
          
          if (docs.length > 0) {
            const historyUpdates = [];
            
            for (const doc of docs) {
              // Find the operation that affected this document
              const matchingOp = updateOperations.find(op => {
                const operation = op.updateOne || op.updateMany;
                const filter = operation.filter;
                
                // Check if this document matches the filter
                return Object.keys(filter).every(key => {
                  if (key === '_id') {
                    return doc._id.toString() === filter._id.toString();
                  }
                  return doc[key] === filter[key];
                });
              });
              
              if (matchingOp) {
                const operation = matchingOp.updateOne || matchingOp.updateMany;
                const update = operation.update;
                
                // Skip if there's no $set operation
                if (!update.$set) continue;
                
                // Create history entry for this document
                const changedFields: Record<string, any> = {};
                let hasChanges = false;
                
                // Extract changed fields from the $set operation
                Object.keys(update.$set).forEach(path => {
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
                    metadata: { ...pluginOptions.metadata }
                  };
                  
                  let history = doc[historyField] || [];
                  history.push(historyEntry);
                  
                  if (history.length > (pluginOptions.maxEntries as number)) {
                    history = history.slice(history.length - (pluginOptions.maxEntries as number));
                  }
                  
                  historyUpdates.push({
                    updateOne: {
                      filter: { _id: doc._id },
                      update: { $set: { [historyField]: history } }
                    }
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
        
        pluginOptions.metadata = originalPluginMetadata;
        
        return result;
      }
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
  schema.statics.bulkWriteWithHistory = async function(operations: any[]) {
    return (this as any).withHistoryContext({}).bulkWrite(operations);
  };

}
