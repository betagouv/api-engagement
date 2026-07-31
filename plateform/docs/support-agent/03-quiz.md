# Quiz

## Séquence commune

Les étapes toujours visibles sont, dans l'ordre : âge, statut, localisation, durée et motivation. La question sur le handicap s'insère après l'âge uniquement lorsque l'âge déclaré est compris entre 26 et 30 ans inclus.

L'âge doit être compris entre 16 et 99 ans inclus. Il est stocké comme valeur numérique et sert à construire une réponse paramétrée pour la taxonomie `tranche_age`. La réponse au handicap met à jour le paramètre `handicap` de cette même réponse.

Le statut utilise la taxonomie `statut`. La localisation produit une réponse paramétrée de taxonomie `location`. La durée accepte une sélection multiple de valeurs de `type_mission`. La motivation est une sélection unique de taxonomie `motivation` ; certaines options peuvent être masquées en fonction du statut.

## Embranchements de motivation

- `me_sentir_utile` ou `reprendre_confiance` affiche `precision_thematique`, mappée vers `engagement_intent`.
- `booster_parcoursup` affiche la question sur l'existence d'une formation précise. Une réponse `oui` affiche un champ texte pour son nom. Le parcours affiche aussi `precision_domaine`.
- `decouvrir_domaine`, `booster_parcoursup` ou `ne_sais_pas` affiche `precision_domaine`, mappée vers `domaine`.
- `tester_orientation`, `experience_terrain` ou `preparer_reconversion` affiche `precision_formation_onisep`.
- `booster_cv`, `enrichir_cv` ou `competences_interet_general` affiche `precision_competences`, mappée vers `competence_rome`.
- `reprendre_activite` affiche une sélection de `secteur_activite`.
- `servir_le_pays` affiche une sélection de taxonomie `servir_pays`.
- `partir_etranger` affiche `precision_international`, sauf si la durée contient `ponctuelle`. La réponse utilise `region_internationale`.

## Validation et navigation

Les étapes de sélection exigent au moins une réponse pour continuer. Plusieurs étapes de précision proposent néanmoins une action permettant de passer la question. Les erreurs de validation sont affichées dans le composant de saisie.

L'ordre de navigation est recalculé à partir des conditions et des réponses courantes. Un accès direct à une étape dont la condition n'est pas satisfaite redirige vers la première étape visible. Le bouton retour cible l'étape visible précédente ; depuis la première étape, il revient au début du quiz ou à l'accueil selon le composant utilisé.

## Construction du payload

Les réponses `options` deviennent une entrée `{ taxonomy, value }` par valeur sélectionnée. Les réponses `params` deviennent `{ taxonomy, params }`. Les réponses purement numériques ou textuelles ne sont pas ajoutées directement par `buildPayload`; elles servent à des conditions ou à d'autres traitements.

## Sources

- `plateform/app/config/quiz-flow.ts`
- `plateform/app/config/quiz-options.ts`
- `plateform/app/routes/quiz/age.tsx`
- `plateform/app/routes/quiz/handicap.tsx`
- `plateform/app/routes/quiz/_layout.tsx`
- `plateform/app/utils/conditions.ts`
- `plateform/app/utils/quiz.ts`
- `plateform/app/stores/quiz.ts`
