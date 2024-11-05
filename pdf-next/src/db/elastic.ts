import { Client } from "@elastic/elasticsearch";
import { ES_ENDPOINT } from "../services/config";

console.log("Connecting to ElasticSearch...");
if (!ES_ENDPOINT) throw new Error("No ES_ENDPOINT detected");

const esClient = new Client({ node: ES_ENDPOINT });

esClient.ping({}, (error) => {
  if (error) throw new Error("ElasticSearch is not connected");
  else console.log("ElasticSearch connected");
});

export default esClient;