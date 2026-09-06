# Parcours utilisateur

## Parcours de recommandation

L'utilisateur commence sur la page d'accueil et accède au quiz. Une arrivée directe sur la première étape démarre une nouvelle tentative, sauf lors d'un simple rafraîchissement. Le quiz enregistre chaque réponse, sauvegarde progressivement le scoring et calcule à nouveau les étapes visibles après chaque validation.

À la fin du parcours, un écran de chargement précède la navigation vers `/results/:userScoringId`. La page de résultats affiche cinq missions prioritaires, puis une liste complémentaire paginée par groupes de huit. Une fiche ouverte depuis les résultats conserve l'identifiant du scoring dans son URL et propose des missions similaires.

## Parcours catalogue

La route `/missions` présente les missions par pages de neuf. L'utilisateur peut combiner les filtres département, dispositif, tranche d'âge, disponibilité, secteur d'activité et domaine. La tranche d'âge est à sélection unique ; les autres filtres acceptent plusieurs valeurs. Les filtres et le numéro de page sont conservés dans l'URL.

Une mission du catalogue ouvre `/missions/:missionId`. Le retour proposé par la fiche dépend de son contexte d'ouverture : résultats personnalisés ou catalogue général.

## Candidature et emails

Le bouton de candidature ouvre l'URL fournie par la mission dans une nouvelle fenêtre. Lorsqu'un scoring utilisateur est connu, il peut être ajouté au lien selon les règles de construction de l'URL.

Depuis les résultats ou une fiche, l'utilisateur peut demander l'envoi de missions par email. L'inscription à la newsletter constitue un flux séparé, également relayé par une route SSR interne.

## Sources

- `plateform/app/routes.ts`
- `plateform/app/routes/quiz/_layout.tsx`
- `plateform/app/routes/results.tsx`
- `plateform/app/routes/missions.tsx`
- `plateform/app/routes/mission-detail.tsx`
- `plateform/app/services/matching.ts`
