import { ROME_MACRO_COMPETENCES } from "@/constants/rome-macro-competences";

const LABEL_BY_CODE = new Map<string, string>(Object.entries(ROME_MACRO_COMPETENCES));

/**
 * Résout une liste de codes macro-compétences ROME 4.0 en libellés, contre la `map` fournie.
 *
 * Les codes `romeSkills` sont stockés bruts (tels que fournis par les flux partenaires) ; la
 * résolution en libellés est éphémère et n'intervient qu'à la construction du prompt.
 * - Les codes inconnus de la `map` sont **ignorés silencieusement** : le référentiel statique peut
 *   diverger des valeurs partenaires, et on ne veut pas polluer le prompt avec des codes non résolus.
 * - L'ordre d'entrée est conservé et les libellés sont dédupliqués.
 */
export const resolveRomeSkillsWith = (codes: string[], map: Map<string, string>): string[] => {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const code of codes ?? []) {
    const label = map.get(code.trim());
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels;
};

/**
 * Résout des codes macro-compétences ROME 4.0 en libellés via le snapshot statique du référentiel.
 * Les codes absents du snapshot sont ignorés (cf. `resolveRomeSkillsWith`).
 */
export const resolveRomeSkills = (codes: string[]): string[] => resolveRomeSkillsWith(codes, LABEL_BY_CODE);
