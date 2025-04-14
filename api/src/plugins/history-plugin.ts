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
 * - withHistoryContext(metadata: Record<string, any>): Returns a new model with the history context: 
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
      }
    };
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

}
