import { HelloworkOffer } from "@/jobs/hellowork/types";
import { stripHtml } from "@/jobs/leboncoin/utils";
import { BUCKET_URL, OBJECT_ACL, putObject } from "@/services/s3";
import { buildFeedXml } from "@/utils/xml";

const CDATA_KEYS = [
  "Nom_Ese",
  "Agence",
  "Poste",
  "Reference",
  "ExternalId",
  "DescriptionEntreprise",
  "DescriptionPoste",
  "Profil",
  "Ville",
  "Voie",
  "Departement",
  "Region",
  "Pays",
  "Url_Reponse",
  "CritereSecteur",
  "CritereContrat",
];

// Un titre déjà préfixé « Service civique », éventuellement entre guillemets, n'est pas re-préfixé.
const SC_PREFIX_REGEX = /^[\s"'«»“”]*service\s+civique\b/i;

/** « Service Civique - {titre} », sans doublon si le titre commence déjà par « Service civique ». */
export function buildScTitle(rawTitle: string): string {
  const cleaned = rawTitle.trim().replace(/\s+/g, " ");
  return SC_PREFIX_REGEX.test(cleaned) ? cleaned : `Service Civique - ${cleaned}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Texte brut → HTML restreint aux balises gérées par Hellowork : paragraphes `<p>`, sauts de ligne `<br>`. */
export function textToHtml(text: string | null | undefined): string {
  const plain = stripHtml(text);
  if (!plain) {
    return "";
  }
  return plain
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function listToHtml(items: string[]): string {
  const lines = items.map((item) => item.trim()).filter(Boolean);
  return lines.length ? `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : "";
}

/** `dd/MM/yyyy HH:mm:ss` en heure de Paris (format conseillé par Hellowork). */
export function formatDate(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Construit le flux XML (envelope <root> → n × <offre>) à partir d'une liste d'offres. */
export function generateXML(offers: HelloworkOffer[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${buildFeedXml({ offre: offers }, CDATA_KEYS, "root")}`;
}

/** Publie le flux sur S3 sous une URL stable (non horodatée). */
export async function storeXML(xml: string): Promise<string> {
  await putObject("xml/hellowork.xml", xml, { ContentType: "application/xml", ACL: OBJECT_ACL.PUBLIC_READ });

  return `${BUCKET_URL}/xml/hellowork.xml`;
}
