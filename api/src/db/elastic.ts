import { Client } from "@elastic/elasticsearch";

import { ES_ENDPOINT } from "../config";
import { captureException } from "../error";

console.log("[ElasticSearch] Connecting to ElasticSearch...");
if (!ES_ENDPOINT) {
  throw new Error("[ElasticSearch] No ElasticSearch endpoint provided!");
}

const esClient = new Client({ node: ES_ENDPOINT });

// Create a promise that resolves when ElasticSearch is connected
export const esConnected = new Promise<void>((resolve, reject) => {
  esClient.ping({}, (error) => {
    if (error) {
      console.error("[ElasticSearch] Connection error:", error);
      captureException(error);
      reject(error);
    } else {
      console.log("[ElasticSearch] Connected");
      resolve();
    }
  });
});

export default esClient;
