import { ADMIN_SNU_URL, ASSOCIATION_URL, BENEVOLAT_URL, JVA_URL, VOLONTARIAT_URL } from "../config";

import { APP_URL } from "../config";

const origin = [
  APP_URL,
  ASSOCIATION_URL,
  VOLONTARIAT_URL,
  BENEVOLAT_URL,
  JVA_URL,
  ADMIN_SNU_URL,
  // SNU admin staging
  "https://app-735c50af-69c1-4a10-ac30-7ba11d1112f7.cleverapps.io",
  "https://app-ec11b799-95d0-4770-8e41-701b4becf64a.cleverapps.io",
];

const corsOptions = { credentials: true, origin };

export default corsOptions;
