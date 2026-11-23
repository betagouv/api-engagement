import { createReadStream, createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { AUDIENCE_MAPPING, DOMAIN_MAPPING, LINKEDIN_XML_URL } from "@/jobs/linkedin/config";
import { missionToLinkedinJobs } from "@/jobs/linkedin/transformers";
import { DispositifDefinition, LinkedInJob } from "@/jobs/linkedin/types";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord } from "@/types/mission";
import { buildFeedXml } from "@/utils/xml";

export { getMissionsCursor } from "@/utils/mission-cursor";

interface LinkedInJobCounters {
  processed: number;
  sent: number;
  expired: number;
  skipped: number;
}

/** Ajoute les offres au temporaire sans les accumuler ; le plafond porte sur les missions. */
export async function writeJobs(missionsCursor: AsyncIterable<MissionRecord>, dispositif: DispositifDefinition, jobsPath: string): Promise<LinkedInJobCounters> {
  const counters = { processed: 0, sent: 0, expired: 0, skipped: 0 };
  async function* generate() {
    let sentMissions = 0;
    for await (const mission of missionsCursor) {
      if (dispositif.maxMissions !== undefined && sentMissions >= dispositif.maxMissions) {
        break;
      }
      counters.processed++;
      // Le filtre d'expiration ne s'applique qu'aux missions JVA.
      if (dispositif.skipExpired && mission.endAt && new Date(mission.endAt).getTime() < Date.now()) {
        counters.expired++;
        continue;
      }
      const jobs = missionToLinkedinJobs(mission, dispositif);
      if (!jobs.length) {
        counters.skipped++;
        continue;
      }
      for (const job of jobs) {
        yield Buffer.from(generateJobXML(job));
        counters.sent++;
      }
      sentMissions++;
    }
  }
  // pipeline gère la contre-pression et ferme les flux en cas d'erreur.
  await pipeline(generate(), createWriteStream(jobsPath, { flags: "a", mode: 0o600 }));
  return counters;
}

const ALLOWED_TAGS = ["b", "strong", "u", "i", "em", "br", "p", "ul", "li"];

/** Ne garde que les balises acceptées par LinkedIn ; un texte brut est converti en paragraphes. */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) {
    return "";
  }
  if (!/<\/?[a-z][\s\S]*>/i.test(input)) {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .split(/\n{2,}/)
      .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
      .join("\n");
  }
  // Un seul passage sur les jetons (balise / texte) : aucune réinterprétation du résultat, donc pas de
  // contournement type `<scr<script>ipt>`. Tout `<` restant dans un texte est échappé.
  const TAG_ALIASES: Record<string, string> = { ol: "ul", div: "p" };
  let skipping: string | null = null;
  const out: string[] = [];
  for (const token of input.split(/(<[^<>]*>)/)) {
    const tag = /^<(\/?)([a-z][a-z0-9]*)\b[^>]*>$/i.exec(token);
    if (!tag) {
      if (!skipping) {
        out.push(token.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      }
      continue;
    }
    const closing = tag[1] === "/";
    const name = tag[2].toLowerCase();
    if (skipping) {
      skipping = closing && name === skipping ? null : skipping;
      continue;
    }
    if (!closing && (name === "script" || name === "style")) {
      skipping = name;
    } else if (/^h[1-6]$/.test(name)) {
      out.push(closing ? "</b></p>" : "<p><b>");
    } else if (ALLOWED_TAGS.includes(name) || TAG_ALIASES[name]) {
      out.push(`<${closing ? "/" : ""}${TAG_ALIASES[name] ?? name}>`);
    }
  }
  return out.join("").trim();
}

/** Longueur du texte visible (sans balises). */
export function textLength(html: string): number {
  // Découpage (et non remplacement) : on ne fait que compter, rien n'est réinjecté.
  return html
    .split(/<[^<>]*>/)
    .join("")
    .trim().length;
}

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
  "industryCode",
  "workplaceTypes",
];

function feedMetadata(jobCount: number) {
  return {
    publisher: "api-engagement",
    publisherUrl: "https://api-engagement.beta.gouv.fr/",
    lastBuildDate: new Date().toUTCString(),
    expectedJobCount: { "#cdata": jobCount },
  };
}

export function generateXML(data: LinkedInJob[]) {
  return buildFeedXml(
    {
      ...feedMetadata(data.length),
      job: data,
    },
    CDATA_KEYS
  );
}

/** Même sérialiseur que le feed complet, mais limité à une offre en mémoire. */
export function generateJobXML(job: LinkedInJob): string {
  return buildFeedXml({ job }, CDATA_KEYS)
    .replace(/^<source>\n/, "")
    .replace(/<\/source>\n?$/, "");
}

export function generateXMLHeader(jobCount: number): string {
  return buildFeedXml(feedMetadata(jobCount), CDATA_KEYS).replace(/<\/source>\n?$/, "");
}

export const XML_FOOTER = "</source>\n";

/** Chaque appel ouvre un nouveau flux, y compris pour le second upload. */
export function createXMLStream(jobsPath: string, header: string): Readable {
  return Readable.from(
    (async function* () {
      yield Buffer.from(header);
      yield* createReadStream(jobsPath);
      yield Buffer.from(XML_FOOTER);
    })(),
    { objectMode: false }
  );
}

export async function storeXML(jobsPath: string, header: string): Promise<string> {
  const date = new Date().toISOString().split("T")[0];

  for (const key of [`xml/linkedin-${date}.xml`, "xml/linkedin.xml"]) {
    const stream = createXMLStream(jobsPath, header);
    try {
      await putObject(key, stream, {
        ContentType: "application/xml",
        ACL: OBJECT_ACL.PUBLIC_READ,
      });
    } finally {
      stream.destroy();
    }
  }

  return `${LINKEDIN_XML_URL}-${date}.xml`;
}

export function getDomainLabel(domain: string): string {
  return DOMAIN_MAPPING[domain] || DOMAIN_MAPPING["autre"];
}

export function getAudienceLabel(audience: string): string {
  return AUDIENCE_MAPPING[audience] || AUDIENCE_MAPPING["any_public"];
}
