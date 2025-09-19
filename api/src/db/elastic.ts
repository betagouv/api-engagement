import { Client } from "@elastic/elasticsearch";
import { captureException } from "../error";

const ES_ENDPOINT = process.env.ES_ENDPOINT;

console.log("[ElasticSearch] Connecting to ElasticSearch...");
if (!ES_ENDPOINT) {
  throw new Error("[ElasticSearch] No ElasticSearch endpoint provided!");
}

console.log("[ElasticSearch] Using endpoint:", ES_ENDPOINT);
const esClient = new Client({ node: ES_ENDPOINT });

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForElasticsearchReady(client: Client) {
  const totalTimeoutMs = Number(process.env.ES_WAIT_TIMEOUT_MS || 60000); // 60s by default
  const pollIntervalMs = 1000;
  const start = Date.now();

  // Try to reach at least yellow status to ensure shards are allocated
  // Retry until success or timeout
  while (true) {
    try {
      await client.cluster.health({ wait_for_status: "yellow", timeout: "5s" });
      console.log("[ElasticSearch] Connected");
      return;
    } catch (error) {
      if (Date.now() - start >= totalTimeoutMs) {
        console.error("[ElasticSearch] Connection timeout:", error);
        captureException(error as Error);
        throw error;
      }
      await wait(pollIntervalMs);
    }
  }
}

export const esConnected = waitForElasticsearchReady(esClient);

export default esClient;
