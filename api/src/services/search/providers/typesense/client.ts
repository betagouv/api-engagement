import Typesense from "typesense";

import { TYPESENSE_API_KEY, TYPESENSE_HOST, TYPESENSE_PORT } from "@/config";

export const typesenseClient = new Typesense.Client({
  nodes: [{ host: TYPESENSE_HOST, port: TYPESENSE_PORT, protocol: "http" }],
  apiKey: TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 5,
});
