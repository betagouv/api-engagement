import { XMLBuilder } from "fast-xml-parser";
import fs from "fs";

import ImportModel from "../../models/import";
import PublisherModel from "../../models/publisher";

import { captureException } from "../../error";
import { putObject, OBJECT_ACL } from "../../services/s3";

import { ENVIRONMENT } from "../../config";
import { Import, Mission } from "../../types";
import { LinkedInJob } from "../../types/linkedin";
import MissionModel from "../../models/mission";
// only works for promoted slots

/**
 * Linkedin feed documentation https://docs.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds-development-guide
 * API link https://api-engagement-bucket.s3.fr-par.scw.cloud/xml/linkedin.xml
 */

const LINKEDIN = "5f8b3c7552a1412baaa0cd44";
// JVA
const JVA = "5f5931496c7ea514150a818f";
// Partenaires qui ont 50 places dans le flux linkedin
const BENEVOLT = "5f592d415655a711feb4460e";
const FONDATION_RAOUL_FOLLEREAU = "634e641783b660072d4c597e";
const VILLE_DE_NANTES = "6347be8883b660072d4c1c53";
const VACANCES_ET_FAMILLES = "619fb1e17d373e07aea8be32";
const PREVENTION_ROUTIERE = "619fab857d373e07aea8be1e";
const MEDECINS_DU_MONDE = "619fae737d373e07aea8be23";
const EGEE = "619faf257d373e07aea8be27";
const ECTI = "619faeb97d373e07aea8be24";
const ADIE = "619fb52a7d373e07aea8be35";
const PARTNERS = [BENEVOLT, FONDATION_RAOUL_FOLLEREAU, VILLE_DE_NANTES, VACANCES_ET_FAMILLES, PREVENTION_ROUTIERE, MEDECINS_DU_MONDE, EGEE, ECTI, ADIE];

const getMissions = async (where: { [key: string]: any }) => {
  const missions = await MissionModel.find(where).sort({ createdAt: "asc" }).lean();
  return missions.map(
    (e) =>
      ({
        ...e,
        applicationUrl: `https://api.api-engagement.beta.gouv.fr/r/${e._id}/${LINKEDIN}`,
      }) as Mission,
  );
};

const handler = async () => {
  const start = new Date();
  console.log(`[Linkedin] Starting at ${start.toISOString()}`);
  try {
    const linkedin = await PublisherModel.findById(LINKEDIN);
    if (!linkedin) {
      captureException(`Linkedin publisher not found`, `Linkedin publisher not found`);
      return;
    }

    const importDoc = {
      name: `LINKEDIN`,
      publisherId: linkedin._id,
      createdCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      missionCount: 0,
      refusedCount: 0,
      startedAt: start,
      endedAt: null,
      status: "SUCCESS",
      failed: { data: [] },
    } as Import;

    const jobs = [];

    const queryMission = { deleted: "no", statusCode: "ACCEPTED" } as { [key: string]: any };
    queryMission.$or = (linkedin.publishers || []).map((e) => ({ publisherId: e.publisher }));

    console.log(`[Linkedin] Querying missions of JeVeuxAider.gouv.fr`);
    const JVAMissions = await getMissions({ deletedAt: null, statusCode: "ACCEPTED", publisherId: JVA });
    console.log(`[Linkedin] ${JVAMissions.length} JVA missions found`);
    let expired = 0;
    for (let i = 0; i < JVAMissions.length; i++) {
      const job = generateJob(JVAMissions[i], "jeveuxaider.gouv.fr");
      if (!job) continue;
      job.description += `<br><br><br> Activité : [${JVAMissions[i].activity}]`;
      if (job.expirationDate && new Date(job.expirationDate).getTime() < Date.now()) {
        expired++;
        continue;
      }
      jobs.push(job);
    }

    console.log(`[Linkedin] ${expired} expired missions found`);

    importDoc.createdCount += jobs.length;
    console.log(`[Linkedin] ${jobs.length} missions added to the feed from JVA`);

    const moderatedMission = await getMissions({ deletedAt: null, [`moderation_${JVA}_status`]: "ACCEPTED", publisherId: { $in: PARTNERS } });
    console.log(`[Linkedin] ${moderatedMission.length} moderated missions found`);
    // let linkedinSlot = moderatedMission.filter((e) => e.metadata === "jobslotlinkedin").length;

    let slot = 0;
    for (let i = 0; i < moderatedMission.length; i++) {
      const job = generateJob(moderatedMission[i], "benevolt");
      if (!job) continue;
      if (slot >= 50) break;

      job.description += `<br><br><br> Mission proposée par notre partenaire Benevolt`;
      job.companyId = "11100845";
      job.company = "jeveuxaider.gouv.fr";
      jobs.push(job);
      slot++;
    }
    importDoc.createdCount += slot;
    console.log(`[Linkedin] ${slot} missions added to the feed from moderated missions`);

    const xml = generateXML(jobs);

    if (ENVIRONMENT === "development") {
      fs.writeFileSync("linkedin.xml", xml);
    } else {
      await putObject("xml/linkedin.xml", xml, { ContentType: "application/xml", ACL: OBJECT_ACL.PUBLIC_READ });
      console.log(`[Linkedin] Create import, created=${importDoc.createdCount}, updated=${importDoc.updatedCount}, deleted=${importDoc.deletedCount}`);
      importDoc.endedAt = new Date();
      await ImportModel.create(importDoc);
    }
  } catch (error: any) {
    console.error(`[Linkedin] Error for Linkedin`, error);
    captureException(`Import linkedin flux failed`, `${error.message} while creating Linkedin flux`);
  }

  console.log(`[Linkedin] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
};

// Generate XML following https://learn.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds-development-guide
// function generateXML(jobs) {
//   var options = {
//     cdataKeys: [
//       "expectedJobCount",
//       "partnerJobId",
//       "description",
//       "title",
//       "applyUrl",
//       "company",
//       "companyId",
//       "location",
//       "city",
//       "country",
//       "postalCode",
//       "expirationDate",
//       "listDate",
//       "industry",
//       "industryCode",
//       "isRemote",
//     ],
//     declaration: { encoding: "UTF-8" },
//   };

//   let source = {
//     publisher: "api-engagement",
//     publisherUrl: "https://api-engagement.beta.gouv.fr/",
//     lastBuildDate: new Date().toUTCString(),
//     expectedJobCount: jobs.length,
//     job: [...jobs],
//   };
//   return js2xmlparser.parse("source", source, options);
// }

const CDATA_KEYS = [
  "partnerJobId",
  "description",
  "title",
  "applyUrl",
  "company",
  "companyId",
  "location",
  "city",
  "country",
  "postalCode",
  "expirationDate",
  "listDate",
  "industry",
  "industryCode",
  "isRemote",
];

const generateXML = (data: LinkedInJob[]) => {
  const obj = {
    source: {
      publisher: "api-engagement",
      publisherUrl: "https://api-engagement.beta.gouv.fr/",
      lastBuildDate: new Date().toUTCString(),
      expectedJobCount: { "#cdata": data.length },
      // Wrap all key of job in cdata
      job: data.map((job: { [key: string]: any }) =>
        Object.keys(job).reduce(
          (acc, key) => {
            acc[key] = CDATA_KEYS.includes(key) ? { "#cdata": job[key] } : job[key];
            return acc;
          },
          {} as { [key: string]: any },
        ),
      ),
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
    cdataPropName: "#cdata",
  });

  // Convert the object to XML
  return builder.build(obj);
};

const mapDomainToIndustryCode = (domain: string) => {
  if (domain === "environnement") return 86;
  if (domain === "solidarite-insertion") return null;
  if (domain === "sante") return 14;
  if (domain === "culture-loisirs") return 30;
  if (domain === "education") return 67;
  if (domain === "emploi") return 137;
  if (domain === "sport") return 33;
  if (domain === "humanitaire") return null;
  if (domain === "animaux") return 16;
  if (domain === "vivre-ensemble") return null;
  if (domain === "autre") return null;
  return null;
};

const generateJob = (mission: Mission, defaultCompany: string) => {
  const startDate = new Date("2024-05-29");
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const initialDescription = diffDays % 6 < 3;
  if (!mission.title) return;
  if (!mission.description) return;
  if (!mission.organizationName) return;
  if (!mission.city) return;
  if (!mission.region) return;
  if (!mission.country) return;

  const job = {
    jobtype: "VOLUNTEER",
    partnerJobId: String(mission._id),
    applyUrl: mission.applicationUrl,
    title: `Bénévolat - ${mission.title}`,
    description: initialDescription
      ? `Ceci est une mission de bénévolat pour <strong>${mission.organizationName}</strong><br>${mission.description.replace("\n", "<br>").replace("\u000b", "")}`
      : `<strong>${mission.organizationName}</strong> vous propose une mission de bénévolat<br>${mission.description
          .replace("\n", "<br>")
          .replace("\u000b", "")}<br><br>Type : missions-benevolat`,
    company: defaultCompany !== "benevolt" && COMPANIES[mission.organizationName] ? mission.organizationName : defaultCompany,
    location: `${mission.city}, ${mission.country} ${mission.region}`,
    country: mission.country,
    city: mission.city,
    postalCode: mission.postalCode,
    listDate: new Date(mission.createdAt).toISOString(),
    industry: mission.domain,
    industryCodes: INDUSTRIES_CODE[mission.domain] ? [{ industryCode: INDUSTRIES_CODE[mission.domain] }] : undefined,
    isRemote: mission.remote === "no" ? "On-site" : mission.remote === "full" ? "Remote" : "Hybrid",
  } as LinkedInJob;
  if (mission.endAt) job.expirationDate = new Date(mission.endAt).toISOString();
  job.companyId = COMPANIES[job.company];

  if (job.partnerJobId.length > 300) return;
  if (!job.title || job.title.length > 300) return;
  if (!job.description || job.description.length < 100 || job.description.length > 25000) return;
  if (job.company.length > 300) return;
  if (job.location.length > 300) return;
  if (job.country && job.country.length > 2) return;

  return job;

  // job.jobtype = "VOLUNTEER";

  // job.partnerJobId = String(mission._id);
  // job.applyUrl = mission.applicationUrl;
  // job.title = `Bénévolat - ${mission.title}`;
  // if (job.partnerJobId.length > 300) return { comment: "Partner job id should be shorter, then 300 symbols", job: null };
  // if (!mission.title) return { comment: "Missing title", job: null };
  // if (job.title.length > 300) return { comment: "Job title should be shorter, then 200 symbols", job: null };
  // if (!mission.description) return { comment: "Missing description", job: null };
  // if (!initialDescription) {
  //   job.description = `Ceci est une mission de bénévolat pour <strong>${mission.associationName}</strong><br>${mission.description.replace("\n", "<br>").replace("\u000b", "")}`;
  // } else {
  //   job.description = `<strong>${mission.associationName}</strong> vous propose une mission de bénévolat<br>${mission.description
  //     .replace("\n", "<br>")
  //     .replace("\u000b", "")}<br><br>Type : missions-benevolat`;
  // }
  // if (!job.description) return { comment: "Missing description", job: null };
  // if (job.description.length < 100) return { comment: "Job description should be longer, then 100 symbols", job: null };
  // if (job.description.length > 25000) return { comment: "Job description should be shorter, then 25000 symbols", job: null };

  // if (!mission.associationName) return { comment: "Missing associationName", job: null };
  // if (mission.associationName.length > 300) return { comment: "Company field should be shorter, then 300 symbols", job: null };
  // if (defaultCompany !== "benevolt" && COMPANIES[mission.associationName]) job.company = mission.associationName;
  // else job.company = defaultCompany;
  // job.companyId = COMPANIES[job.company];

  // if (!mission.city) return { comment: "Missing city", job: null };
  // if (!mission.region) return { comment: "Missing region", job: null };
  // if (!mission.country) return { comment: "Missing country", job: null };
  // if (mission.country.length > 2) return { comment: "Country field should be shorter, then 2 symbols", job: null };
  // if (mission.postalCode) job.postalCode = mission.postalCode;
  // job.location = `${mission.city}, ${mission.country} ${mission.region}`;
  // if (job.location.length > 300) return { comment: "Location field should be shorter, then 300 symbols", job: null };
  // job.country = mission.country;
  // job.city = mission.city;

  // if (mission.endAt) job.expirationDate = mission.endAt.toISOString();

  // // if (trackedJobs) {
  // //   job.listDate = "2024-02-27T00:00:00.000Z";
  // // } else {
  // //   job.listDate = mission.createdAt;
  // //   if (job.listDate.length > 300) return { comment: "Job listDate field should be shorter, then 300 symbols if provided", job: null };
  // // }

  // if (mission.createdAt) {
  //   job.listDate = mission.createdAt.toISOString();
  //   if (job.listDate.length > 300) return { comment: "Job listDate field should be shorter, then 300 symbols if provided", job: null }; // ??? why ??? TODO
  // }

  // if (mission.domain) {
  //   job.industryCode = mission.domain;
  //   const industryCode = mapDomainToIndustryCode(job.industryCode);
  //   if (industryCode) job.industryCodes = [{ industryCode }];
  // }

  // job.isRemote = mission.remote === "no" ? "On-site" : mission.remote === "full" ? "Remote" : "Hybrid";

  // return { job, comment: "" };
};

const COMPANIES = {
  "jeveuxaider.gouv.fr": "11100845",
  benevolt: "11022359",
  Makesense: "737838",
  "Lobby des Consciences": "65886275",
  "Article 1": "27203583",
  "Ma Petite Planète": "37251808",
  "La Fourmilière": "10137854",
  "L'ENVOL": "10204194",
  "Entraide Scolaire Amicale": "18336541",
  "Mon Emile Association": "43292744",
  "Communauté de Communes Rhône Lez Provence": "10603588",
  "Parrains Par Mille | PPM": "28978823",
  "SECOURS CATHOLIQUE 2A": "816177",
  "Coallia - MAINtenant": "14838053",
  "LA CRAVATE SOLIDAIRE MOBILE": "5186825",
  "RESTOS DU COEUR - 23": "5346642",
  "SECOURS CATHOLIQUE PYRENEES GASCOGNE (65/32)": "816177",
  "Fondation Partage et Vie": "3001926",
  "Protection Civile Paris Seine": "3493705",
  "Energie Jeunes - Grand Est & Franche Comté": "1104605",
  HopHopFood: "11136137",
  "La Ligue contre le cancer Loire-Atlantique": "11136137",
  "Secours Catholique du Gard": "1104605",
  "Armée du Salut (Fondation de l')": "10106687",
  "Emmaüs Cahors (46)": "3272543",
  "Energie Jeunes - Provence-Alpes-Côte d'Azur": "1104605",
  "Mutualite Française Centre Val de Loire": "27207455",
  "Protection Civile du Nord": "5342210",
  "SECOURS CATHOLIQUE 59": "816177",
  "ADMR du Morbihan": "49761428",
  "ARAVIC France victimes 19": "42458934",
  "Action Contre la Faim": "1334237",
  "Centre Communal d'Action Sociale (CCAS) de LONS LE SAUNIER": "14813865",
  "EMMAUS Solidarité": "3272543",
  "LIGUE CONTRE LE CANCER": "1999812",
  "La Cravate Solidaire Troyes": "69722073",
  "Les Restos du Coeur de l'Orne": "5346642",
  "Les Restos du Cœur - Eure": "5346642",
  "Petits Frères des Pauvres 64/40": "5109201",
  "Protection Civile du Val d'Oise": "3187369",
  "Secours Populaire de l'Eure": "15205609",
  // ZUPdeCO: "1899598",
  "1 Déchet Par Jour": "13032883",
  "ADMR du Nord": "18381666",
  AFEV: "10329919",
  "AFEV - Côte d'Or": "10329919",
  "Afev 06": "10329919",
  "Association Prévention Routière Île-de-France": "7214867",
  "Association Séphora Berrebi": "34715721",
} as { [key: string]: string };

const INDUSTRIES_CODE = {
  environnement: 86,
  "solidarite-insertion": null,
  sante: 14,
  "culture-loisirs": 30,
  education: 67,
  emploi: 137,
  sport: 33,
  humanitaire: null,
  animaux: 16,
  "vivre-ensemble": null,
  autre: null,
} as { [key: string]: number | null };

export default { handler };
