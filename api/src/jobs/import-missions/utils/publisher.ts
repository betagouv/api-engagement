import ImportModel from "../../../models/import";

/**
 * Check if publisher missions should be cleaned
 * We clean missions if imports failed for 1 week consecutively for given publisher
 * @param publisherId
 * @returns boolean
 */
export const shouldCleanMissionsForPublisher = async (publisherId: string): Promise<boolean> => {
  const thresholdDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const imports = await ImportModel.find({ publisherId, endedAt: { $gt: thresholdDate } });
  const failedImports = imports.filter((i) => i.status === "FAILED");
  const successImports = imports.filter((i) => i.status === "SUCCESS");

  return failedImports.length > 0 && successImports.length === 0;
};
