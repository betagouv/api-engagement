process.env.TZ = "Europe/Paris";

export const ENVIRONMENT = process.env.ENV || "development";
export const ES_ENDPOINT = process.env.ES_ENDPOINT;
export const DB_ENDPOINT = process.env.DB_ENDPOINT;
export const STATS_INDEX = "stats";
export const MISSION_INDEX = "mission";
export const PORT = ENVIRONMENT === "production" ? 8080 : 4001;

export const SENTRY_DSN = process.env.SENTRY_DSN;

export const SENDINBLUE_APIKEY = process.env.SENDINBLUE_APIKEY;

export const SLACK_TOKEN = process.env.SLACK_TOKEN;
export const SLACK_WARNING_CHANNEL_ID = process.env.SLACK_WARNING_CHANNEL_ID || "C052V2UF918";
export const SLACK_LBC_CHANNEL_ID = process.env.SLACK_LBC_CHANNEL_ID || "C07SPFG724V";
export const SLACK_CRON_CHANNEL_ID = process.env.SLACK_CRON_CHANNEL_ID || "C085S6M2K5J";

export const DATA_SUBVENTION_TOKEN = process.env.DATA_SUBVENTION_TOKEN || "";

export const SCW_ACCESS_KEY = process.env.SCW_ACCESS_KEY;
export const SCW_SECRET_KEY = process.env.SCW_SECRET_KEY;
export const SCW_HOST = process.env.SCW_HOST || "https://s3.fr-par.scw.cloud";
export const REGION = process.env.SCW_REGION || "fr-par";
export const BUCKET_NAME = process.env.BUCKET_NAME || "api-engagement-bucket-staging";

// Ids
export const JVA_ID = "5f5931496c7ea514150a818f"; // JeVeuxAider Id
export const SC_ID = "5f99dbe75eb1ad767733b206"; // Service Civique Id
