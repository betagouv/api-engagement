export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Sérialise une valeur pour une insertion sûre dans un `<script>` inline.
 *
 * `JSON.stringify` échappe le contexte chaîne JS mais pas le contexte HTML : les séquences
 * `</script>` ou `<!--` fermeraient la balise prématurément. On encode donc `<` en `<`
 * (échappement JS valide) pour empêcher tout breakout (cf. CodeQL `js/bad-code-sanitization`).
 */
export function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Format attendu : nom@domaine.extension (pas de vérification de l'existence de la boîte).
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const INVALID_EMAIL_FORMAT_ERROR = "Le format de l'adresse email n'est pas valide. Le format attendu est : nom@email.fr";

export function isValidEmail(value: string): boolean {
  return EMAIL_FORMAT.test(value);
}
