import { SortOrder } from "mongoose";
import ReportModel from "../models/report";
import { Report } from "../types";

export class ReportRepository {
  static async create(reportData: Partial<Report>): Promise<Report> {
    return ReportModel.create(reportData);
  }

  static async findById(id: string): Promise<Report | null> {
    return ReportModel.findById(id);
  }

  static async update(id: string, updateData: Partial<Report>): Promise<Report | null> {
    return ReportModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  static async find(filters: Partial<Report> = {}, skip: number = 0, limit: number = 25, sortBy: "createdAt" | "publisherName" | "sentAt" = "createdAt"): Promise<Report[]> {
    const sort: { [key: string]: SortOrder } = { [sortBy]: -1 };
    return ReportModel.find(filters).limit(limit).skip(skip).sort(sort);
  }

  static async count(filters: Partial<Report> = {}): Promise<number> {
    return ReportModel.countDocuments(filters);
  }

  static async getFacets(filters: Partial<Report> = {}): Promise<{
    publishers: Array<{ _id: string; count: number; name: string }>;
    status: Array<{ _id: string; count: number }>;
  }> {
    const facets = await ReportModel.aggregate([
      { $match: filters },
      {
        $facet: {
          publishers: [
            {
              $group: {
                _id: "$publisherId",
                count: { $sum: 1 },
                name: { $first: "$publisherName" },
              },
            },
          ],
          status: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        },
      },
    ]);

    return {
      publishers: facets[0].publishers,
      status: facets[0].status.filter((e: any) => e._id),
    };
  }

  static async delete(id: string): Promise<Report | null> {
    return ReportModel.findByIdAndDelete(id);
  }
}

export default ReportRepository;
