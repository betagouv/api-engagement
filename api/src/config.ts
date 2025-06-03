process.env.TZ = "Europe/Paris";

export const PORT = process.env.PORT || 4000;
export const ENV = process.env.ENV || "development";
export const SECRET = process.env.SECRET || "not-so-secret";

export const APP_URL = process.env.APP_URL || "http://localhost:3000";
export const API_URL = process.env.API_URL || "http://localhost:4000";
export const BENEVOLAT_URL = process.env.BENEVOLAT_URL || "http://localhost:3001";
export const VOLONTARIAT_URL = process.env.VOLONTARIAT_URL || "http://localhost:3001";
export const ASSOCIATION_URL = process.env.ASSOCIATION_URL || "http://localhost:4001";
export const JVA_URL = "https://www.jeveuxaider.gouv.fr";
export const ADMIN_SNU_URL = "https://admin.snu.gouv.fr";

export const ES_ENDPOINT = process.env.ES_ENDPOINT;
export const DB_ENDPOINT = process.env.DB_ENDPOINT;
export const MISSION_INDEX = "mission";
export const ASSOS_INDEX = "association";
export const STATS_INDEX = "stats";

export const SENDINBLUE_APIKEY = process.env.SENDINBLUE_APIKEY;

export const SLACK_TOKEN = process.env.SLACK_TOKEN;
export const SLACK_JOBTEASER_CHANNEL_ID = process.env.SLACK_JOBTEASER_CHANNEL_ID || "C080H9MH56W";

export const SENTRY_DSN = process.env.SENTRY_DSN;

// add bucket storage
export const SCW_ACCESS_KEY = process.env.SCW_ACCESS_KEY;
export const SCW_SECRET_KEY = process.env.SCW_SECRET_KEY;
export const SCW_HOST = process.env.SCW_HOST || "https://s3.fr-par.scw.cloud";
export const BUCKET_NAME = process.env.BUCKET_NAME || "api-engagement-bucket-staging";
export const REGION = process.env.REGION || "fr-par";

// Ids
export const SC_ID = "5f99dbe75eb1ad767733b206"; // Service Civique Id
export const JVA_ID = "5f5931496c7ea514150a818f"; // JeVeuxAider Id
export const LBC_ID = "60cd04a0d2321e05a743fa8d"; // Leboncoin Id

export const DEFAULT_AVATAR = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/default.jpg";
