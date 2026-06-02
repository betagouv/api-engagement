# Instructions agent (API Engagement / `plateform`)

Ce fichier décrit uniquement les conventions spécifiques à `plateform/`. Les règles globales de langue, git, sécurité, PR et exclusions génériques restent définies dans l’`AGENTS.md` à la racine du dépôt.

## Périmètre et fichiers à ne pas modifier

En plus des exclusions racine, ne pas éditer/committer directement `.react-router/` : ce répertoire contient les types générés par React Router.

## Vue d’ensemble (architecture)

Stack principale : React 19, React Router v7 en mode framework avec SSR activé, Vite, TypeScript strict, Tailwind CSS v4, DSFR, Zustand et Vitest.

Structure notable :

- `app/root.tsx` : layout HTML global, imports DSFR, favicon DSFR, header/footer et outlet applicatif.
- `app/routes.ts` : table de routage React Router. C’est la source de vérité pour les URLs, les routes API SSR et le quiz.
- `app/routes/` : pages et loaders/actions de routes.
- `app/routes/api.*.ts` : façade serveur SSR vers l’API backend. Ces routes signent les appels avec `PUBLISHER_API_KEY` sans exposer cette clé au navigateur.
- `app/routes/quiz/` : parcours de quiz. Un step = une route, avec layout commun dans `quiz/_layout.tsx`.
- `app/components/` : composants UI par domaine (`landing`, `quiz`, `results`, `missions`, `mission-detail`, `layout`, `ui`).
- `app/services/` : clients applicatifs, appels à la façade locale et orchestration côté front.
- `app/services/api/` : client serveur vers l’API upstream, utilisé uniquement depuis loaders/actions SSR.
- `app/stores/quiz.ts` : store Zustand persisté en `localStorage` pour les réponses du quiz.
- `app/config/quiz-flow.ts` : ordre et conditions d’affichage des steps du quiz.
- `app/config/quiz-options.ts` : options affichées dans le quiz.
- `app/utils/` : logique pure testable (conditions, navigation quiz, mapping mission, domaines).
- `app/assets/` : images et SVG applicatifs.

## Routage et SSR

- `react-router.config.ts` active `ssr: true`.
- Ajouter une route dans `app/routes.ts` en même temps que le fichier sous `app/routes/`.
- Les routes publiques de pages (`/`, `/quiz`, `/results/:id`, `/missions`) rendent des composants React.
- Les routes `api/*` sont des endpoints internes à l’app `plateform`, consommés par le navigateur via `~/services/client`.
- Les appels backend qui nécessitent `PUBLISHER_API_KEY` doivent rester côté serveur, via `~/services/api`.

Pattern attendu pour une route API SSR :

1. Lire et valider les paramètres nécessaires depuis `request`.
2. Appeler `api.get/post/put<T>()` depuis `~/services/api`.
3. Retourner `Response.json({ ok: true, data })`.
4. En cas d’erreur upstream, retourner `upstreamErrorResponse(error)`.

Ne pas importer `process.env.PUBLISHER_API_KEY` dans du code exécuté côté navigateur.

## Clients API et configuration

- `app/services/config.ts` contient les variables publiques `VITE_*` et quelques constantes produit.
- `VITE_API_URL` est accessible au client ; `SERVER_API_URL` et `PUBLISHER_API_KEY` sont utilisés côté serveur.
- `app/services/client.ts` appelle les routes locales `/api/...` depuis le navigateur.
- `app/services/api/index.ts` appelle l’API backend depuis le serveur SSR et ajoute `x-api-key` si disponible.
- Les types de requêtes/réponses partagés doivent venir de `@engagement/dto` plutôt que de types locaux dupliqués.

## Quiz

Le quiz est un flow conditionnel piloté par `app/config/quiz-flow.ts`.

Conventions :

- Chaque étape a un `StepId`, une route dédiée et, si besoin, une `condition`.
- Le wording et le rendu vivent dans le composant de route du step.
- Les options réutilisables vivent dans `app/config/quiz-options.ts`.
- Le store `useQuizStore` conserve les réponses, `userScoringId` et `distinctId`.
- Les composants de step appellent `goNext()` / `goBack()` via le contexte exposé par `quiz/_layout.tsx`.
- `buildPayload()` transforme les réponses du store vers le format DTO attendu par l’API.

Lors de l’ajout d’un step :

1. Ajouter le `StepId` et l’entrée `QUIZ_FLOW`.
2. Ajouter la route dans `app/routes.ts`.
3. Créer le fichier dans `app/routes/quiz/`.
4. Mapper la réponse vers la bonne taxonomie (`taxonomy`, `option_ids` ou `params`).
5. Ajouter/adapter des tests dans `app/utils/__tests__/` si la navigation, les conditions ou le payload changent.

## Packages partagés

`plateform` dépend de packages workspace :

- `@engagement/dto` : contrats de données partagés avec l’API.
- `@engagement/taxonomy` : référentiels et helpers de taxonomie.

Préférer ces packages aux copies locales de types, clés ou libellés métier. Si une modification touche un contrat partagé, vérifier l’impact côté `api/` et autres consommateurs.

## UI, styles et accessibilité

- Le DSFR est chargé globalement dans `app/root.tsx`. Utiliser les composants/classes DSFR quand ils couvrent le besoin.
- Tailwind v4 est importé dans `app/main.css` et sert surtout aux layouts et ajustements fins.
- Conserver les classes DSFR `fr-*` pour les éléments qui relèvent du système de design public.
- Les composants interactifs doivent garder des labels accessibles (`aria-label`, texte visible, états d’erreur DSFR).
- Éviter les refontes visuelles opportunistes : rester cohérent avec les composants existants et le parcours actuel.
- Les cartes mission et la carte Leaflet sont utilisées dans des contextes desktop/mobile différents ; vérifier les deux layouts si on touche `results`, `mission-detail` ou `mission-map`.

## TypeScript et conventions de code

- Utiliser l’alias `~/` pour les imports internes à `app/`.
- Garder les composants petits et nommés par domaine.
- Placer la logique pure dans `app/utils/` ou `app/services/` plutôt que dans les composants si elle devient testable ou partagée.
- Ne pas introduire une nouvelle dépendance UI ou state-management sans besoin clair ; DSFR, React Router, Tailwind et Zustand couvrent déjà les usages principaux.
- Respecter le formatage existant. Le `package.json` configure Prettier avec `printWidth: 180` et le plugin d’organisation des imports.

## Tests

Vitest est configuré en environnement `node` et cible les tests :

- `app/**/__tests__/**/*.{test,spec}.ts`

Priorités de test :

- logique de conditions du quiz (`app/utils/conditions.ts`) ;
- calcul des steps et payload quiz (`app/utils/quiz.ts`) ;
- mapping mission/résultats (`app/utils/mission.ts`) ;
- clients et routes API quand le comportement d’enveloppe ou d’erreur change.

Pour les changements purement visuels, privilégier au minimum `npm run typecheck` et une vérification manuelle du parcours concerné.

## Commandes

Source de vérité : `plateform/package.json`.

- Développement : `npm run dev` (port 3005)
- Build : `npm run build`
- Démarrage production local : `npm run start`
- Typecheck : `npm run typecheck`
- Lint : `npm run lint`
- Fix lint : `npm run lint:fix`
- Format : `npm run prettier`
- Tests : `npm run test`
- Tests watch : `npm run test:watch`
- Coverage : `npm run test:coverage`

Depuis la racine du monorepo, utiliser de préférence `npm --workspace=plateform run <script>`.

## Sécurité

- Ne jamais exposer `PUBLISHER_API_KEY` dans du code client.
- Seules les variables préfixées `VITE_` doivent être considérées comme publiques.
- Les actions d’email ou de scoring doivent continuer à passer par la façade `/api/...` afin de conserver les règles d’authentification côté serveur.

## Exigences de travail (pour un agent)

- Respecter la séparation : composant UI → service client local → route API SSR → API backend.
- Ne pas court-circuiter la façade SSR pour les appels qui nécessitent une clé serveur.
- Vérifier l’impact mobile et desktop pour les pages de résultats, missions et détail mission.
- Ajouter des tests ciblés quand la logique de quiz, de mapping ou d’appel API change.
- Proposer une validation adaptée : généralement `npm --workspace=plateform run typecheck`, `npm --workspace=plateform run lint` et `npm --workspace=plateform run test` selon le périmètre.
