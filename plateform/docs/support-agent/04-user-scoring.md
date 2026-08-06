# Scoring utilisateur

## Données enregistrées

Un scoring utilisateur contient une liste de réponses taxonomiques. Une réponse peut avoir soit une valeur, soit un objet de paramètres. Lors de la création, un `distinctId` et l'état d'activation des alertes de missions peuvent également être transmis.

Le store du quiz conserve un `distinctId` stable entre plusieurs tentatives. Il conserve également l'identifiant du scoring créé par l'API. Une nouvelle tentative efface les réponses et l'identifiant du scoring, mais conserve le `distinctId`.

## Création et mise à jour

À la première sauvegarde contenant au moins une réponse taxonomique, la plateforme crée un scoring et stocke l'identifiant retourné. Les sauvegardes suivantes mettent à jour ce scoring avec le même `distinctId`.

Une promesse de sauvegarde en cours est partagée entre la validation de l'étape et la navigation afin d'éviter deux appels simultanés pour la même étape. Elle est réinitialisée lors d'un changement de route. Après une mise à jour réussie, le cache de la première page de résultats associé au scoring est invalidé.

## Erreurs

Si aucune réponse taxonomique n'est disponible, la sauvegarde est considérée comme réussie sans appel API. En cas d'échec de création ou de mise à jour, la navigation est interrompue et le quiz affiche : « Impossible d'enregistrer tes réponses. Réessaie dans quelques instants. » Une nouvelle tentative de sauvegarde reste alors possible.

L'API de mise à jour exige le `distinctId`. La réponse indique l'identifiant du scoring, le nombre d'éléments créés et l'état de l'alerte de missions.

## Sources

- `plateform/app/routes/quiz/_layout.tsx`
- `plateform/app/services/user-scoring.ts`
- `plateform/app/stores/quiz.ts`
- `plateform/app/utils/quiz.ts`
- `packages/dto/src/resources/user-scoring.ts`
- `api/src/controllers/user-scoring.ts`
- `api/src/services/user-scoring/index.ts`
