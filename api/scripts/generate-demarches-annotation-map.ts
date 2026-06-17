/**
 * generate-demarches-annotation-map.ts
 *
 * Génère le mapping `DEMARCHE_SIMPLIFIEES_ANNOTATION_KEY_MAP` (slug → clé de préremplissage) dans
 * api/src/services/demarches-simplifiees/utils.ts.
 *
 * L'API GraphQL de démarches-simplifiées ne permet PAS de lister les démarches d'un compte (seul
 * `demarche(number:)` existe). La liste des démarches connues est donc lue depuis le mapping
 * `DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP` du même fichier. Pour chacune, on interroge ses
 * annotations et on récupère celle libellée "Identifiant de la redirection", au format `champ_<id sans ==>`.
 *
 * Usage :
 *   npx ts-node generate-demarches-annotation-map.ts [--dry-run]
 *
 * Variables d'environnement requises (lues depuis api/.env) :
 *   DEMARCHES_SIMPLIFIEES_TOKEN, et éventuellement DEMARCHES_SIMPLIFIEES_BASE_URL.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const UTILS_PATH = path.resolve(__dirname, "../src/services/demarches-simplifiees/utils.ts");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = process.env.DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";
const TOKEN = process.env.DEMARCHES_SIMPLIFIEES_TOKEN;
const REDIRECTION_ANNOTATION_LABEL = "Identifiant de la redirection";

// Reproduit la logique de api/src/utils/string.ts pour comparer les libellés de la même manière.
const slugify = (value: string) => {
  const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;";
  const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------";
  const p = new RegExp(a.split("").join("|"), "g");
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(p, (c) => b.charAt(a.indexOf(c)))
    .replace(/&/g, "")
    .replace(/'/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// Extrait les couples slug → numéro depuis le bloc DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP de utils.ts.
const parseDemarcheNumbers = (source: string): { slug: string; number: number }[] => {
  const block = source.match(/DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP[^{]*\{([^}]*)\}/);
  if (!block) {
    throw new Error("DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP introuvable dans utils.ts");
  }

  const entries: { slug: string; number: number }[] = [];
  const entryPattern = /"([^"]+)"\s*:\s*(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(block[1])) !== null) {
    entries.push({ slug: match[1], number: Number.parseInt(match[2], 10) });
  }
  return entries;
};

// Interroge l'API GraphQL pour récupérer la clé de préremplissage de l'annotation "Identifiant de la redirection".
const fetchAnnotationKey = async (demarcheNumber: number): Promise<string | null> => {
  const graphqlQuery = `
    query getAnnotationDescriptors($number: Int!) {
      demarche(number: $number) {
        activeRevision {
          annotationDescriptors {
            id
            label
          }
        }
      }
    }
  `;

  const response = await fetch(`${BASE_URL}/api/v2/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query: graphqlQuery, variables: { number: demarcheNumber } }),
  });

  const body = (await response.json()) as {
    data?: { demarche: { activeRevision: { annotationDescriptors: { id: string; label: string }[] } } };
    errors?: { message: string }[];
  };
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }

  const descriptors = body.data?.demarche.activeRevision.annotationDescriptors || [];
  const annotation = descriptors.find((descriptor) => slugify(descriptor.label) === slugify(REDIRECTION_ANNOTATION_LABEL));
  if (!annotation) {
    return null;
  }

  return `champ_${annotation.id.replace("==", "")}`;
};

// Réécrit le bloc DEMARCHE_SIMPLIFIEES_ANNOTATION_KEY_MAP de utils.ts avec le mapping fraîchement généré.
const writeAnnotationMap = (source: string, map: Record<string, string>): string => {
  const entries = Object.entries(map)
    .map(([slug, key]) => `  "${slug}": "${key}",`)
    .join("\n");
  const block = `export const DEMARCHE_SIMPLIFIEES_ANNOTATION_KEY_MAP: Record<string, string> = {\n${entries}\n};`;
  return source.replace(/export const DEMARCHE_SIMPLIFIEES_ANNOTATION_KEY_MAP: Record<string, string> = \{[^}]*\};/, block);
};

const main = async () => {
  if (!TOKEN) {
    throw new Error("DEMARCHES_SIMPLIFIEES_TOKEN manquant (api/.env)");
  }

  const dryRun = process.argv.includes("--dry-run");
  const source = fs.readFileSync(UTILS_PATH, "utf8");
  const demarches = parseDemarcheNumbers(source);
  console.log("demarches", JSON.stringify(demarches, null, 2));
  console.log(`${demarches.length} démarche(s) à traiter depuis DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP\n`);

  const map: Record<string, string> = {};
  for (const { slug, number } of demarches) {
    try {
      const key = await fetchAnnotationKey(number);
      if (key) {
        map[slug] = key;
        console.log(`✓ ${slug} (#${number}) → ${key}`);
      } else {
        console.warn(`⚠ ${slug} (#${number}) : annotation "${REDIRECTION_ANNOTATION_LABEL}" absente, ignorée`);
      }
    } catch (error) {
      console.error(`✗ ${slug} (#${number}) :`, error instanceof Error ? error.message : error);
    }
  }

  if (dryRun) {
    console.log("\n[dry-run] Mapping généré (non écrit) :");
    console.log(JSON.stringify(map, null, 2));
    return;
  }

  const updated = writeAnnotationMap(source, map);
  fs.writeFileSync(UTILS_PATH, updated);
  console.log(`\n${Object.keys(map).length} entrée(s) écrite(s) dans ${path.relative(process.cwd(), UTILS_PATH)}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[generate-demarches-annotation-map] Fatal error:", error);
    process.exit(1);
  });
