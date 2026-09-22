import { convert } from "html-to-text";

import { buildFeedXml } from "@/jobs/base/xml";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { BUCKET_URL, OBJECT_ACL, putObject } from "@/services/s3";

// Champs texte à encapsuler en CDATA (à n'importe quel niveau de l'arbre).
const CDATA_KEYS = [
  "partner_unique_reference",
  "client_reference",
  "title",
  "description",
  "contract_type",
  "mode",
  "contact",
  "city",
  "zip_code",
  "country",
  "type",
  "company",
  "logo",
];

/** Nettoie un texte HTML en texte brut (leboncoin refuse toute mise en forme HTML). */
export function stripHtml(text: string | null | undefined): string {
  if (!text) {
    return "";
  }
  return convert(text, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
      // html-to-text met les titres en MAJUSCULES par défaut : on conserve la casse d'origine.
      ...["h1", "h2", "h3", "h4", "h5", "h6"].map((selector) => ({ selector, options: { uppercase: false } })),
    ],
  }).trim();
}

/** Formate une date au format AAAA-MM-JJ. */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Tronque une chaîne à `max` caractères. */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

/**
 * Tronque un titre à `maxLength` caractères sans couper de mot : nettoyage (trim + espaces
 * réduits), coupe au dernier espace, retrait de la ponctuation finale, ajout de "…" (U+2026).
 */
export function truncateAtWord(rawTitle: string, maxLength: number): string {
  const cleaned = rawTitle.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  const slice = cleaned.slice(0, maxLength - 1); // on garde une place pour le "…"
  const lastSpace = slice.lastIndexOf(" ");
  let cut = lastSpace === -1 ? slice : slice.slice(0, lastSpace);
  cut = cut.replace(/[\s.,;:(/…·•-]+$/u, "");
  return `${cut}…`;
}

/**
 * Construit le titre d'une offre Service Civique : "Service Civique - {title}".
 * Si le titre nettoyé fait ≤ 82 caractères, il est conservé tel quel ; sinon il est tronqué
 * à 81 caractères au dernier espace puis suffixé de "…" (résultat ≤ 100 caractères).
 */
export function buildScTitle(rawTitle: string): string {
  const cleaned = rawTitle.trim().replace(/\s+/g, " ");
  const truncated = cleaned.length <= 82 ? cleaned : truncateAtWord(cleaned, 82);
  return `Service Civique - ${truncated}`;
}

/** Construit le flux XML (envelope <source> → n × <job>) à partir d'une liste d'offres. */
export function generateXML(offers: LeboncoinOffer[]): string {
  return buildFeedXml({ publisher: "api-engagement", publisherurl: "https://api-engagement.beta.gouv.fr/", job: offers }, CDATA_KEYS);
}

/** Publie le flux sur S3 : objet daté + objet stable. Retourne l'URL de l'objet daté. */
export async function storeXML(xml: string, slug: string): Promise<string> {
  const date = formatDate(new Date());

  await putObject(`xml/${slug}-${date}.xml`, xml, { ContentType: "application/xml", ACL: OBJECT_ACL.PUBLIC_READ });
  await putObject(`xml/${slug}.xml`, xml, { ContentType: "application/xml", ACL: OBJECT_ACL.PUBLIC_READ });

  return `${BUCKET_URL}/xml/${slug}-${date}.xml`;
}
