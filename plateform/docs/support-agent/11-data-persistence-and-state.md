# Persistance des données et états

## Store du quiz

Le store Zustand est persisté dans `localStorage` sous la clé `quiz-answers`, avec une version de schéma égale à 6. Il contient les réponses, l'identifiant du scoring, le `distinctId`, l'identifiant de tentative, l'heure de début et l'identifiant de la dernière tentative ayant émis l'événement de démarrage.

- **`distinctId`** : Créé une fois et conservé entre les tentatives.
- **`reset()`** : Efface les réponses et le scoring, crée un nouvel identifiant de tentative et une nouvelle heure de début, mais conserve le `distinctId`.
- Une arrivée directe sur la première étape réinitialise le quiz, sauf lorsque la navigation du document est un rafraîchissement.
- La persistance permet de restaurer les réponses après un refresh et de recalculer les étapes visibles.
- La migration de la version 5 à 6 du schéma supprime les réponses aux questions `interaction` et `imprevu`.

## Cache des résultats

Les treize premiers résultats sont mis en cache en mémoire par `userScoringId`. Le cache contient une promesse afin que plusieurs consommateurs partagent la même requête. Une erreur retire l'entrée et une mise à jour du scoring l'invalide explicitement.

- Ce cache est propre au processus navigateur courant : il ne constitue pas une persistance durable et disparaît lors d'un rechargement complet de l'application.

## Autres états locaux

Les choix de consentement, certains paramètres d'attribution de campagne et l'indicateur d'utilisateur interne disposent de leurs propres mécanismes de lecture ou de persistance côté navigateur. Ils sont distincts du store du quiz.

### Consentement aux cookies

Les préférences de consentement aux cookies sont stockées dans un cookie nommé `plateform_consent`. Ce cookie est mis à jour pour refléter les choix de consentement actuels et est appliqué immédiatement aux services concernés.

### Attribution de campagne

Les paramètres de campagne (UTM) sont stockés sous la clé `plateform.campaign_attribution` dans le `localStorage`. Une nouvelle campagne écrase l'attribution précédente, tandis que le trafic direct prolonge la session existante si elle n'a pas expiré.

### Indicateur d'utilisateur interne

L'indicateur d'utilisateur interne est stocké sous la clé `api-engagement.internal_user` dans le `localStorage`. Il peut être activé ou désactivé via des paramètres d'URL, et persiste entre les sessions.

## Sources

- `plateform/app/stores/quiz.ts`
- `plateform/app/routes/quiz/age.tsx`
- `plateform/app/routes/quiz/_layout.tsx`
- `plateform/app/services/matching.ts`
- `plateform/app/services/cookie-consent.ts`
- `plateform/app/utils/internal-user-flag.ts`
- `plateform/app/utils/campaign-attribution.ts`
