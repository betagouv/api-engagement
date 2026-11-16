import { AUDIENCE_MAPPING, DOMAIN_MAPPING, LINKEDIN_XML_URL } from "@/jobs/linkedin/config";
import { missionToLinkedinJobs } from "@/jobs/linkedin/transformers";
import { DispositifDefinition, LinkedInJob } from "@/jobs/linkedin/types";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { MissionRecord } from "@/types/mission";
import { buildFeedXml } from "@/utils/xml";

export { getMissionsCursor } from "@/utils/mission-cursor";

/** Transforme les missions d'un dispositif en jobs (un par adresse). `maxMissions` du dispositif plafonne les missions diffusées. */
export async function generateJobs(
  missionsCursor: AsyncIterable<MissionRecord>,
  dispositif: DispositifDefinition
): Promise<{ jobs: LinkedInJob[]; expired: number; skipped: number; processed: number; sentMissions: number }> {
  const jobs = [] as LinkedInJob[];
  let expired = 0;
  let skipped = 0;
  let processed = 0;
  let sentMissions = 0;

  for await (const mission of missionsCursor) {
    if (dispositif.maxMissions !== undefined && sentMissions >= dispositif.maxMissions) {
      break;
    }
    processed++;
    // Le filtre d'expiration ne s'applique qu'aux missions JVA.
    if (dispositif.skipExpired && mission.endAt && new Date(mission.endAt).getTime() < Date.now()) {
      expired++;
      continue;
    }
    const missionJobs = missionToLinkedinJobs(mission, dispositif);
    if (!missionJobs.length) {
      skipped++;
      continue;
    }
    jobs.push(...missionJobs);
    sentMissions++;
  }

  return { jobs, expired, skipped, processed, sentMissions };
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
  return html.replace(/<[^>]*>/g, "").trim().length;
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

export function generateXML(data: LinkedInJob[]) {
  return buildFeedXml(
    {
      publisher: "api-engagement",
      publisherUrl: "https://api-engagement.beta.gouv.fr/",
      lastBuildDate: new Date().toUTCString(),
      expectedJobCount: { "#cdata": data.length },
      job: data,
    },
    CDATA_KEYS
  );
}

export async function storeXML(xml: string): Promise<string> {
  const date = new Date().toISOString().split("T")[0];

  await putObject(`xml/linkedin-${date}.xml`, xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  await putObject("xml/linkedin.xml", xml, {
    ContentType: "application/xml",
    ACL: OBJECT_ACL.PUBLIC_READ,
  });

  return `${LINKEDIN_XML_URL}-${date}.xml`;
}

export function getDomainLabel(domain: string): string {
  return DOMAIN_MAPPING[domain] || DOMAIN_MAPPING["autre"];
}

export function getAudienceLabel(audience: string): string {
  return AUDIENCE_MAPPING[audience] || AUDIENCE_MAPPING["any_public"];
}
