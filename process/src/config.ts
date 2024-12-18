process.env.TZ = "Europe/Paris";

export const PORT = process.env.PORT || 4001;
export const API_URL = process.env.API_URL || "http://localhost:4000";
export const API_KEY = process.env.API_KEY;

export const ENVIRONMENT = process.env.ENV || "development";
export const ES_ENDPOINT = process.env.ES_ENDPOINT;
export const DB_ENDPOINT = process.env.DB_ENDPOINT;
export const STATS_INDEX = "stats";
export const MISSION_INDEX = "mission";
export const RNA_INDEX = "rna";

export const SENTRY_DSN = process.env.SENTRY_DSN;

export const SENDINBLUE_APIKEY = process.env.SENDINBLUE_APIKEY;

export const SLACK_TOKEN = process.env.SLACK_TOKEN;
export const SLACK_WARNING_CHANNEL_ID = "C052V2UF918";
export const SLACK_LBC_CHANNEL_ID = "C07SPFG724V";
export const SLACK_PRODUCT_CHANNEL_ID = "C019LKL5N69";
export const SLACK_CRON_CHANNEL_ID = "C085S6M2K5J";

export const DATA_SUBVENTION_TOKEN = process.env.DATA_SUBVENTION_TOKEN || "";

export const SCW_HOST = process.env.SCW_HOST || "https://s3.fr-par.scw.cloud";
// export const SCW_BUCKET = process.env.SCW_BUCKET || "api-engagement-bucket";
// export const SCW_REGION = process.env.SCW_REGION || "fr-par";
export const BUCKET_NAME = process.env.SCW_BUCKET || "api-engagement-bucket";
export const REGION = process.env.SCW_REGION || "fr-par";
export const SCW_ACCESS_KEY = process.env.SCW_ACCESS_KEY;
export const SCW_SECRET_KEY = process.env.SCW_SECRET_KEY;
