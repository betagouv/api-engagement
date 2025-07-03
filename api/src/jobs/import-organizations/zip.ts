import yauzl from "yauzl";

import { parseFile } from "./file-parser";

// Process a single file from the zip
const processZipEntry = async (zipfile: any, entry: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    console.log(`[Organization] Processing file: ${entry.fileName}`);

    if (/\/$/.test(entry.fileName)) {
      // Skip directories
      resolve(0);
      return;
    }

    zipfile.openReadStream(entry, (err: Error | null, readStream: any) => {
      if (err) {
        console.error(`Error opening stream for ${entry.fileName}:`, err);
        reject(err);
        return;
      }

      parseFile(readStream)
        .then((count) => {
          console.log(`[Organization] Processed ${count} records from ${entry.fileName}`);
          resolve(count);
        })
        .catch((error) => {
          console.error(`Error processing ${entry.fileName}:`, error);
          reject(error);
        });
    });
  });
};

// Process the zip file sequentially
export const readZip = async (file: string): Promise<number> => {
  let total = 0;

  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, async (err, zipfile) => {
      if (err) {
        return reject(err);
      }

      // Process entries one by one
      const processNextEntry = async () => {
        try {
          const entry = await new Promise<any>((resolveEntry, rejectEntry) => {
            zipfile.once("entry", resolveEntry);
            zipfile.once("error", rejectEntry);
            zipfile.readEntry();
          });

          if (!entry) {
            // No more entries
            zipfile.close();
            resolve(total);
            return;
          }

          // Process this entry
          const count = await processZipEntry(zipfile, entry);
          total += count;

          // Continue with next entry
          processNextEntry();
        } catch (error) {
          zipfile.close();
          reject(error);
        }
      };

      // Start processing
      processNextEntry();
    });
  });
};
