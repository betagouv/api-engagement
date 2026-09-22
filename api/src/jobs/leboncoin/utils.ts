import { XMLBuilder } from "fast-xml-parser";
import { convert } from "html-to-text";

import { SC_TITLE_MAX_LENGTH, SC_TITLE_PREFIX } from "@/jobs/leboncoin/config";
import { LeboncoinOffer } from "@/jobs/leboncoin/types";
import { OBJECT_ACL, putObject } from "@/services/s3";

// Champs texte à encapsuler en CDATA (à n'importe quel niveau de l'arbre).
const CDATA_KEYS = [
  "partner_unique_reference",
  "client_reference",
  "title",
  "description",
  "contact",
  "street",
  "zip_code",
  "city",
  "country",
  "name",
  "url",
  "profile",
  "skills",
  "picture",
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
      // Par défaut html-to-text met les titres en MAJUSCULES : on conserve la casse d'origine.
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
 * Construit le titre d'une offre Service Civique : "Service Civique - {title}".
 * Règle : titre nettoyé (trim + espaces réduits). Si ≤ 82 → inchangé. Sinon coupe à 81
 * caractères max, au dernier espace avant la position 81 (jamais au milieu d'un mot),
 * retire la ponctuation/espaces finaux, puis ajoute "…" (U+2026). Résultat ≤ 100 caractères.
 */
export function buildScTitle(rawTitle: string): string {
  const cleaned = rawTitle.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 82) {
    return `${SC_TITLE_PREFIX}${cleaned}`;
  }

  const slice = cleaned.slice(0, SC_TITLE_MAX_LENGTH); // 81 premiers caractères
  const lastSpace = slice.lastIndexOf(" ");
  // Mot unique très long sans espace : coupe sèche à 81 caractères.
  let cut = lastSpace === -1 ? slice : slice.slice(0, lastSpace);
  // Retire ponctuation et espaces en fin de chaîne.
  cut = cut.replace(/[\s.,;:(/…·•-]+$/u, "");

  return `${SC_TITLE_PREFIX}${cut}…`;
}

/** Construit le flux XML (envelope <source> → n × <job>) à partir d'une liste d'offres. */
export function generateXML(offers: LeboncoinOffer[]): string {
  const wrapWithCdata = (obj: any, parentKey?: string): any => {
    if (Array.isArray(obj)) {
      if (parentKey && CDATA_KEYS.includes(parentKey)) {
        return obj.map((el) => (typeof el === "string" ? { "#cdata": el } : wrapWithCdata(el)));
      }
      return obj.map((el) => wrapWithCdata(el));
    }
    if (obj && typeof obj === "object") {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (CDATA_KEYS.includes(key) && typeof value === "string") {
          result[key] = { "#cdata": value };
        } else if (Array.isArray(value) || (value && typeof value === "object")) {
          result[key] = wrapWithCdata(value, key);
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    return obj;
  };

  const obj = {
    source: {
      publisher: "api-engagement",
      publisherurl: "https://api-engagement.beta.gouv.fr/",
      lastbuilddate: new Date().toUTCString(),
      job: offers.map((offer) => wrapWithCdata(offer)),
    },
  };

  const builder = new XMLBuilder({ ignoreAttributes: false, format: true, suppressEmptyNode: true, cdataPropName: "#cdata" });
  return builder.build(obj);
}

/** Publie le flux sur S3 : objet daté + objet stable. Retourne l'URL de l'objet daté. */
export async function storeXML(xml: string, slug: string, baseUrl: string): Promise<string> {
  const date = formatDate(new Date());

  await putObject(`xml/${slug}-${date}.xml`, xml, { ContentType: "application/xml", ACL: OBJECT_ACL.PUBLIC_READ });
  await putObject(`xml/${slug}.xml`, xml, { ContentType: "application/xml", ACL: OBJECT_ACL.PUBLIC_READ });

  return `${baseUrl}-${date}.xml`;
}
