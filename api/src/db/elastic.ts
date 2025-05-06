import { Client } from "@elastic/elasticsearch";

import { ES_ENDPOINT } from "../config";
import { captureException } from "../error";

console.log("Connecting to ElasticSearch...");
if (!ES_ENDPOINT) {
  throw new Error("No ElasticSearch endpoint provided!");
}

const esClient = new Client({ node: ES_ENDPOINT });

esClient.ping({}, (error) => {
  if (error) {
    captureException(error);
  } else {
    console.log("ElasticSearch connected");
  }
});

export default esClient;
