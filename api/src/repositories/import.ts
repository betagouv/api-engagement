import ImportModel from "../models/import";
import { Import } from "../types";

/**
 * See if should be directly in the postgres
 */

export class ImportRepository {
  static async create(importData: Partial<Import>): Promise<Import> {
    return ImportModel.create(importData);
  }

  static async findById(id: string): Promise<Import | null> {
    return ImportModel.findById(id);
  }

  static async update(id: string, updateData: Partial<Import>): Promise<Import | null> {
    return ImportModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  static async find(filters: Partial<Import> = {}, skip: number = 0, limit: number = 25): Promise<Import[]> {
    return ImportModel.find(filters).sort({ startedAt: -1 }).limit(limit).skip(skip);
  }

  static async findLastByPublisher(): Promise<Import[]> {
    const imports = await ImportModel.aggregate([{ $group: { _id: "$publisherId", doc: { $last: "$$ROOT" } } }]);

    return imports.map((i) => ({
      _id: i.doc._id,
      name: i.doc.name,
      publisherId: i.doc.publisherId,
      startedAt: i.doc.startedAt,
      endedAt: i.doc.endedAt,
      status: i.doc.status,
      createdCount: i.doc.createdCount,
      deletedCount: i.doc.deletedCount,
      updatedCount: i.doc.updatedCount,
      missionCount: i.doc.missionCount,
      refusedCount: i.doc.refusedCount,
    }));
  }

  static async count(filters: Partial<Import> = {}): Promise<number> {
    return ImportModel.countDocuments(filters);
  }

  static async delete(id: string): Promise<Import | null> {
    return ImportModel.findByIdAndDelete(id);
  }
}

export default ImportRepository;
