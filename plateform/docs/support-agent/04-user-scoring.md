# Scoring utilisateur

## Données enregistrées

Un scoring utilisateur contient une liste de réponses taxonomiques. Chaque réponse peut être soit une valeur, soit un objet de paramètres. Lors de la création, un `distinctId` et l'état d'activation des alertes de missions peuvent également être transmis.

Le store du quiz conserve un `distinctId` stable entre plusieurs tentatives. Il conserve également l'identifiant du scoring créé par l'API. Une nouvelle tentative efface les réponses et l'identifiant du scoring, mais conserve le `distinctId`.

## Création et mise à jour

### Création

Lors de la première sauvegarde contenant au moins une réponse taxonomique, la plateforme crée un scoring utilisateur. Le `distinctId` peut être fourni, mais n'est pas obligatoire. L'état de l'alerte de missions est par défaut désactivé, sauf indication contraire. L'API retourne un identifiant de scoring qui est stocké pour les mises à jour futures.

### Mise à jour

Les sauvegardes suivantes mettent à jour le scoring existant en utilisant le même `distinctId`. L'API de mise à jour exige que le `distinctId` soit fourni. Les mises à jour peuvent inclure des réponses taxonomiques et/ou l'état de l'alerte de missions. Si aucune réponse taxonomique n'est fournie, l'état de l'alerte de missions doit être présent pour que la mise à jour soit valide.

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
