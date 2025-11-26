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

export const SENTRY_DSN_API = process.env.SENTRY_DSN_API;
export const SENTRY_DSN_JOBS = process.env.SENTRY_DSN_JOBS;

// Bucket storage
export const SCW_ACCESS_KEY = process.env.SCW_ACCESS_KEY;
export const SCW_SECRET_KEY = process.env.SCW_SECRET_KEY;
export const SCW_HOST = process.env.SCW_HOST || "https://s3.fr-par.scw.cloud";
export const BUCKET_NAME = process.env.BUCKET_NAME || "api-engagement-bucket-staging";
export const REGION = process.env.REGION || "fr-par";

// Slack
export const SLACK_TOKEN = process.env.SLACK_TOKEN;
export const SLACK_WARNING_CHANNEL_ID = process.env.SLACK_WARNING_CHANNEL_ID || "C052V2UF918";
export const SLACK_LBC_CHANNEL_ID = process.env.SLACK_LBC_CHANNEL_ID || "C07SPFG724V";
export const SLACK_CRON_CHANNEL_ID = process.env.SLACK_CRON_CHANNEL_ID || "C085S6M2K5J";
export const SLACK_JOBTEASER_CHANNEL_ID = process.env.SLACK_JOBTEASER_CHANNEL_ID || "C080H9MH56W";

export const DATA_SUBVENTION_TOKEN = process.env.DATA_SUBVENTION_TOKEN;

// Ids (ISO prod / staging)
export const PUBLISHER_IDS = {
  ADIE: "619fb52a7d373e07aea8be35",
  API_ENGAGEMENT: "63da29db7d356a87a4e35d4a",
  BENEVOLT: "5f592d415655a711feb4460e",
  BOUYGUES_TELECOM: "616fefd119fb03075a0b0843",
  ECTI: "619faeb97d373e07aea8be24",
  EGEE: "619faf257d373e07aea8be27",
  FONDATION_RAOUL_FOLLEREAU: "634e641783b660072d4c597e",
  JAGIS_POUR_LA_NATURE: "5f59305b6c7ea514150a818e",
  JEVEUXAIDER: "5f5931496c7ea514150a818f",
  JOBTEASER: "66ffce58f95ec99387109053",
  LEBONCOIN: "60cd04a0d2321e05a743fa8d",
  LETUDIANT: "65251e076c0781cafb6ba76d",
  LINKEDIN: "5f8b3c7552a1412baaa0cd44",
  MEDECINS_DU_MONDE: "619fae737d373e07aea8be23",
  PREVENTION_ROUTIERE: "619fab857d373e07aea8be1e",
  SERVICE_CIVIQUE: ENV === "production" ? "5f99dbe75eb1ad767733b206" : "",
  TALENT: ENV === "production" ? "6891e7994a3ae7f2f0c9d71a" : "6891e7ecb804a451c68368eb",
  GRIMPIO: ENV === "production" ? "9ccdd7fdb2715f6c766fd989" : "237ff477c3c4bc897e81c249",
  VACANCES_ET_FAMILLES: "619fb1e17d373e07aea8be32",
  VILLE_DE_NANTES: "6347be8883b660072d4c1c53",
};

export const DEFAULT_AVATAR = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/default.jpg";
export const JVA_LOGO_URL = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/jva-logo.png";
export const JVA_100_LOGO_URL = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/jva-logo-100x100.png";
export const ASC_LOGO_URL = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/asc-logo.png";
export const ASC_100_LOGO_URL = "https://api-engagement-bucket.s3.fr-par.scw.cloud/img/asc-logo-100x100.png";

// Piloty job boards
export const PILOTY_BASE_URL = process.env.PILOTY_BASE_URL || "https://sandbox-api.piloty.fr";
export const LETUDIANT_PILOTY_TOKEN = process.env.LETUDIANT_PILOTY_TOKEN || "";
