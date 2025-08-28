import ImportModel from "../../../models/import";
import { NUMBER_OF_DAYS_TO_CLEAN } from "../config";

/**
 * Check if publisher missions should be cleaned
 * We clean missions if imports failed for7 days consecutively for given publisher
 * @param publisherId
 * @returns boolean
 */
export const shouldCleanMissionsForPublisher = async (publisherId: string): Promise<boolean> => {
  const thresholdDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * NUMBER_OF_DAYS_TO_CLEAN);
  const imports = await ImportModel.find({ publisherId, endedAt: { $gt: thresholdDate } });

  return imports.length > 0 && imports.every((i) => i.status === "FAILED");
};
