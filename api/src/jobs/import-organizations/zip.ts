import yauzl from "yauzl";

import { parseFile } from "./file-parser";

// Process a single file from the zip
const processZipEntry = async (zipfile: any, entry: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    console.log(`[Zip] Processing file: ${entry.fileName}`);

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
          console.log(`[Zip] Processed ${count} records from ${entry.fileName}`);
          resolve(count);
        })
        .catch((error) => {
          console.error(`[Zip] Error processing ${entry.fileName}:`, error);
          reject(error);
        });
    });
  });
};

// Process the zip file sequentially
export const readZip = async (file: string): Promise<number> => {
  let total = 0;
  let entriesSeen = 0;

  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        return reject(err);
      }

      const onError = (e: any) => {
        try {
          zipfile.close();
        } catch (_) {}
        reject(e);
      };

      zipfile.on("error", onError);

      // When archive ends, resolve with total processed
      zipfile.on("end", () => {
        try {
          zipfile.close();
        } catch (_) {}
        console.log(`[Zip] ZIP end reached: entries=${entriesSeen}, totalRecords=${total}`);
        resolve(total);
      });

      // Handle each entry then move to the next one
      zipfile.on("entry", async (entry) => {
        try {
          entriesSeen += 1;
          if (entriesSeen % 5 === 1) {
            console.log(`[Zip] Processing entry #${entriesSeen}: ${entry.fileName}`);
          }
          const count = await processZipEntry(zipfile, entry);
          total += count;
          zipfile.readEntry();
        } catch (e) {
          onError(e);
        }
      });

      // Start the iteration
      console.log(`[Zip] Starting ZIP processing for file ${file}`);
      zipfile.readEntry();
    });
  });
};
