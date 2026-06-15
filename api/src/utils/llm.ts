// Caractères de contrôle C0 (hors tabulation et saut de ligne) et DEL.
// Construit via `new RegExp` à partir d'une chaîne échappée pour ne contenir que de l'ASCII imprimable.
const CONTROL_CHARS_REGEX = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]", "g");

const TRUNCATION_MARKER = "…[tronqué]";

/**
 * Neutralise une chaîne issue d'une source non fiable avant de l'injecter dans un prompt LLM.
 * Défense contre l'injection de prompt et l'inflation de tokens :
 *  - normalise les fins de ligne et supprime les caractères de contrôle C0 (hors saut de ligne et tabulation)
 *  - neutralise les séquences susceptibles d'usurper la structure du prompt :
 *    les chevrons `<`/`>` (balises sentinelles) et les clôtures de bloc `--- … ---`
 *  - effondre 3+ retours à la ligne consécutifs en 2
 *  - `trim` puis tronque à `maxLength`, suffixe `…[tronqué]` inclus si coupé
 *
 * @param value La chaîne non fiable
 * @param maxLength Longueur maximale autorisée (caractères)
 * @returns La chaîne neutralisée
 */
export const sanitizeForPrompt = (value: string, maxLength: number): string => {
  if (maxLength <= 0) {
    return "";
  }

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

  if (maxLength <= TRUNCATION_MARKER.length) {
    return TRUNCATION_MARKER.slice(0, maxLength);
  }

  return `${neutralized.slice(0, maxLength - TRUNCATION_MARKER.length).trimEnd()}${TRUNCATION_MARKER}`;
};
