/**
 * Slugify a string
 *
 * @param value The string to slugify
 * @returns The slugified string
 */
export const slugify = (value: string) => {
  const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;";
  const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------";
  const p = new RegExp(a.split("").join("|"), "g");
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, "") // Remove &
    .replace(/'/g, "-") // Replace ' with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};

/**
 * Capitalize the first letter of each word in a string
 *  Use Unicode letters to avoid treating accented chars as non-word boundaries.
 *  Uses cases in french city names:
 *  - Saint-Étienne
 *  - L'Isle-d'Abeau
 *  - Chambon-La-Forêt

 * @param string The string to capitalize
 * @returns The capitalized string
 */
export const capitalizeFirstLetter = (string: string): string => {
  if (!string) {
    return string;
  }

  const lower = string.toLocaleLowerCase("fr-FR");
  return lower.replace(/(^|[\s'’\-])(\p{L})/gu, (match, boundary, letter, offset, full) => {
    if (boundary === "-") {
      const nextTwo = full.slice(offset + 1, offset + 3);
      if (nextTwo === "d'" || nextTwo === "l'" || nextTwo === "d’" || nextTwo === "l’") {
        return boundary + letter;
      }
    }
    return boundary + letter.toLocaleUpperCase("fr-FR");
  });
};

/**
 * Check if a string contains special characters
 *
 * @param string The string to check
 * @returns True if the string contains special characters, false otherwise
 */
export const hasSpecialChar = (string: string) => {
  return /[$&+,:;=?@#|'<>.^*()%!-]/.test(string);
};

/**
 * Check if a string contains numbers
 *
 * @param string The string to check
 * @returns True if the string contains numbers, false otherwise
 */
export const hasNumber = (string: string) => {
  return /[0-9]/.test(string);
};

/**
 * Check if a string contains letters
 *
 * @param string The string to check
 * @returns True if the string contains letters, false otherwise
 */
export const hasLetter = (string: string) => {
  return /[a-zA-Z]/.test(string);
};

export const cleanIdParam = (param: string): string => {
  if (!param) {
    return param;
  }

  // Delete everything non alphanumeric and non-hyphen (UUID or MongoDB ObjectId)
  return param.replace(/[^a-zA-Z0-9-].*$/, "");
};

export const isBlank = (value?: string | null) => value === null || value === undefined || value === "";

// Caractères de contrôle C0 (hors tabulation et saut de ligne) et DEL.
// Construit via `new RegExp` à partir d'une chaîne échappée pour ne contenir que de l'ASCII imprimable.
const CONTROL_CHARS_REGEX = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]", "g");

/**
 * Neutralise une chaîne issue d'une source non fiable avant de l'injecter dans un prompt LLM.
 * Défense contre l'injection de prompt et l'inflation de tokens :
 *  - normalise les fins de ligne et supprime les caractères de contrôle C0 (hors saut de ligne et tabulation)
 *  - neutralise les séquences susceptibles d'usurper la structure du prompt :
 *    les chevrons `<`/`>` (balises sentinelles) et les clôtures de bloc `--- … ---`
 *  - effondre 3+ retours à la ligne consécutifs en 2
 *  - `trim` puis tronque à `maxLength` (suffixe `…[tronqué]` si coupé)
 *
 * @param value La chaîne non fiable
 * @param maxLength Longueur maximale autorisée (caractères)
 * @returns La chaîne neutralisée
 */
export const sanitizeForPrompt = (value: string, maxLength: number): string => {
  const neutralized = value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(/[<>]/g, "")
    .replace(/-{3,}/g, "--")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (neutralized.length <= maxLength) {
    return neutralized;
  }
  return `${neutralized.slice(0, maxLength).trimEnd()}…[tronqué]`;
};

/**
 * Normalize a string for fuzzy comparison: lowercase + remove diacritics.
 * "Qualité" → "qualite", "SANTE" → "sante"
 */
const normalizeToken = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "");

/**
 * Jaccard similarity between two underscore-separated token strings.
 * Order-insensitive and case/diacritic-insensitive:
 * "sante_social" and "social_sante" → 1.0
 * "Qualité_logistique" and "qualite_logistique" → 1.0
 */
export const jaccardSimilarity = (a: string, b: string): number => {
  const setA = new Set(a.split("_").map(normalizeToken));
  const setB = new Set(b.split("_").map(normalizeToken));
  const intersection = new Set([...setA].filter((t) => setB.has(t)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
};

/**
 * Find the closest match for a candidate string among a set of valid keys,
 * using Jaccard similarity on underscore-split tokens.
 * Returns the best match if its score >= threshold, null otherwise.
 */
export const fuzzyMatchKey = (
  candidate: string,
  validKeys: Iterable<string>,
  threshold: number
): { key: string; score: number } | null => {
  let best: { key: string; score: number } | null = null;
  for (const key of validKeys) {
    const score = jaccardSimilarity(candidate, key);
    if (score >= threshold && (!best || score > best.score || (score === best.score && key < best.key))) {
      best = { key, score };
    }
  }
  return best;
};
