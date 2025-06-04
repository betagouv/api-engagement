import { SortOrder } from "mongoose";
import WarningModel from "../models/warning";
import { Warning } from "../types";

export class WarningRepository {
  static async create(data: Partial<Warning>): Promise<Warning> {
    return WarningModel.create(data);
  }

  static async findById(id: string): Promise<Warning | null> {
    return WarningModel.findById(id);
  }

  static async update(id: string, data: Partial<Warning>): Promise<Warning | null> {
    return WarningModel.findByIdAndUpdate(id, data, { new: true });
  }

  static async find(filters: Partial<Warning> = {}, limit?: number, sort: { [key: string]: SortOrder } = { createdAt: -1 }): Promise<Warning[]> {
    const query = WarningModel.find(filters).sort(sort);
    if (limit) query.limit(limit);
    return query.lean();
  }

  static async count(filters: Partial<Warning> = {}): Promise<number> {
    return WarningModel.countDocuments(filters);
  }

  static async delete(id: string): Promise<Warning | null> {
    return WarningModel.findByIdAndDelete(id);
  }
}

export default WarningRepository;
