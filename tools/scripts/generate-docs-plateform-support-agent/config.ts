import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { DocumentConfig, SourcesConfig } from "./types";

export const DOCUMENTS: DocumentConfig[] = [
  { path: "01-product-overview.md", title: "Vue d'ensemble du produit", objective: "Décrire la finalité, les fonctionnalités, les acteurs et l'architecture fonctionnelle." },
  { path: "02-user-journeys.md", title: "Parcours utilisateur", objective: "Décrire les parcours de bout en bout, du quiz à la candidature, aux emails et à la newsletter." },
  {
    path: "03-quiz.md",
    title: "Quiz",
    objective: "Documenter les étapes, options, validations, embranchements, navigation et réponses du quiz.",
    scope: ["plateform/app/config/quiz-flow/**", "plateform/app/routes/quiz/**", "plateform/app/utils/quiz.ts", "plateform/app/stores/quiz.ts"],
    instructions:
      "Décris le flow actif (version courante et sa provenance), puis, pour CHAQUE étape/question du flow sélectionné, liste EXHAUSTIVEMENT toutes les réponses possibles : donne pour chacune son libellé affiché et sa valeur technique, sous forme de tableau ou de liste par question. N'omets aucune option, y compris les options conditionnelles ou de repli. Indique le type de réponse (choix unique/multiple), les validations et les embranchements associés. Décris le flow effectivement sélectionné, pas une version historique.",
  },
  {
    path: "04-user-scoring.md",
    title: "Scoring utilisateur",
    objective: "Décrire la création, la mise à jour et la persistance du scoring utilisateur.",
    scope: ["api/src/services/user-scoring/**", "plateform/app/stores/**"],
  },
  {
    path: "05-mission-search.md",
    title: "Recherche de missions",
    objective: "Décrire le catalogue, les filtres, facettes, pagination et états de résultat.",
    scope: ["api/src/services/mission-browse/**", "api/src/services/search/**", "plateform/app/components/missions/**"],
  },
  {
    path: "06-matching.md",
    title: "Matching",
    objective: "Décrire les versions, taxonomies, pondérations, scores, gates, classement, pagination et cache.",
    scope: ["api/src/services/matching-engine/**", "api/src/services/mission-match/**"],
    instructions:
      "Concentre-toi uniquement sur la version de moteur ACTIVE (celle indiquée par la configuration déployée). Détaille précisément SA formule de calcul du score en respectant la normalisation en DEUX temps réellement implémentée : (1) le score taxonomique est d'abord normalisé en divisant la somme pondérée des correspondances par la SOMME DES POIDS des seules taxonomies auxquelles l'utilisateur a répondu ; (2) le score total vaut ce score taxonomique tel quel s'il n'y a pas de score géographique, sinon `(taxonomyWeight * score_taxonomique + geoWeight * score_geo) / (taxonomyWeight + geoWeight)` — le dénominateur final est la somme des DEUX poids scalaires `taxonomyWeight` et `geoWeight`, et NON la somme des poids de taxonomies plus `geoWeight`. Précise aussi : socle par taxonomie matchée (`taxonomyOrBaseScore`) et part liée à la qualité intra-taxonomie, les poids `taxonomyWeights` de la version active, les cas remote (`remoteFullGeoScore`, `remoteLocalGeoScore`, `missingGeoScore`), les gates d'éligibilité (hors score), le classement et les tie-breakers. Explicite l'agrégation finale, pas seulement les composantes. Ne détaille PAS l'algorithme des versions antérieures : mentionne au plus leur existence et, en une phrase, ce que la version active change par rapport à la précédente.",
  },
  {
    path: "07-eligibility-and-scoring.md",
    title: "Éligibilité et scoring des missions",
    objective: "Documenter les règles déterministes et contraintes d'éligibilité.",
    scope: ["api/src/services/mission-scoring/**"],
  },
  {
    path: "08-taxonomies.md",
    title: "Taxonomies",
    objective: "Décrire les taxonomies, leurs valeurs, transformations et usages.",
    scope: ["packages/taxonomy/src/**"],
    instructions:
      "Liste l'INTÉGRALITÉ des taxonomies définies dans `TAXONOMY` (`packages/taxonomy/src/taxonomy.ts`), sans en omettre aucune, sous forme de tableau : clé, finalité et valeurs possibles. Pour chaque taxonomie, énumère TOUTES ses valeurs définies dans `TAXONOMY` : n'utilise jamais « etc. », « … » ni aucune abréviation ou troncature ; si la liste est longue, mets-la sur plusieurs lignes mais reste exhaustif. Indique aussi les valeurs neutres (cf. `NEUTRAL_TAXONOMY_VALUE_KEYS`). Pour chaque taxonomie, indique explicitement sa nature : (a) ENRICHIE PAR LLM lorsqu'elle porte le flag `enrichable` (cf. `ENRICHABLE_TAXONOMIES`) ; (b) DÉCLARATIVE/DÉRIVÉE sinon (issue des données ou d'un transformateur comme `tranche-age`, `location`, `department-code`). Signale à part les taxonomies GATE d'éligibilité (flag `gate`, cf. `GATE_TAXONOMIES`). Termine par une synthèse : quelles taxonomies sont enrichies par LLM vs uniquement déclaratives. Ne détaille pas la formule de score du matching (couverte par le chapitre 06).",
  },
  {
    path: "09-mission-detail-and-application.md",
    title: "Détail d'une mission et candidature",
    objective: "Décrire le chargement, l'affichage, la candidature et les missions similaires.",
    scope: ["plateform/app/components/mission-detail/**", "plateform/app/routes/mission-detail.tsx"],
    instructions:
      "Distingue clairement les données REÇUES de l'API de celles réellement AFFICHÉES par l'interface. Pour la fiche mission, n'énumère comme affichés que les champs effectivement rendus par les composants desktop et mobile de `plateform/app/components/mission-detail/` ; n'annonce pas comme visibles des informations (ex. mode remote, ouverture aux mineurs, accessibilité PMR, nombre de places) qui sont dans les données mais non rendues. En cas de doute, indique le champ comme reçu mais non affiché plutôt que de le présenter comme visible.",
  },
  {
    path: "10-emails-newsletter-and-consent.md",
    title: "Emails, newsletter et consentement",
    objective: "Décrire les emails, la newsletter et les règles de consentement.",
    scope: ["api/src/services/mission-email/**", "api/src/services/newsletter/**", "api/src/controllers/email.ts", "api/src/controllers/newsletter.ts"],
    instructions:
      "Décris le comportement RÉELLEMENT implémenté pour l'envoi d'email de missions : conditions d'envoi, statuts de sortie (ex. `skipped`) et raisons (ex. `NO_MATCHING_RESULT`), et ce qui se passe en l'absence de résultat de matching pour la version courante. N'invente aucun mécanisme de récupération ou de recalcul qui ne figure pas dans les sources : si `buildMissionMatchingEmailParams` retourne `null` et que l'envoi est simplement ignoré, dis-le explicitement sans laisser entendre qu'un recalcul a lieu.",
  },
  {
    path: "11-data-persistence-and-state.md",
    title: "Persistance des données et états",
    objective: "Décrire les données persistées, identifiants, caches, resets et invalidations.",
  },
  {
    path: "12-errors-edge-cases-and-fallbacks.md",
    title: "Erreurs, cas limites et fallbacks",
    objective: "Décrire les comportements prévus pour les erreurs, valeurs absentes et fallbacks.",
  },
];

const readStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) throw new Error(`${label} doit être une liste de chaînes non vides`);
  return value;
};

export const loadConfig = (configPath: string): SourcesConfig => {
  const parsed = YAML.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown> | null;
  if (!parsed || parsed.version !== 1) throw new Error("sources.yml doit déclarer version: 1");
  return { version: 1, include: readStringArray(parsed.include, "include"), exclude: readStringArray(parsed.exclude, "exclude") };
};

export const resolveRepositoryPaths = (repositoryRoot: string) => ({
  docsDirectory: path.join(repositoryRoot, "plateform/docs/support-agent"),
  configPath: path.join(repositoryRoot, "plateform/docs/support-agent/sources.yml"),
  readmePath: path.join(repositoryRoot, "plateform/docs/support-agent/README.md"),
  // Valeurs effectivement déployées (versions actives, flags) qui priment sur les défauts du code.
  deployedConfigPath: path.join(repositoryRoot, "terraform/envs/production.tfvars"),
  // Code du générateur lui-même : un changement ici (config, prompts, logique) modifie la sortie
  // sans qu'aucune source métier ne change, et doit donc forcer une régénération complète.
  generatorDirectory: path.join(repositoryRoot, "tools/scripts/generate-docs-plateform-support-agent"),
});
