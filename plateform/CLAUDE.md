# Instructions agent (API Engagement / `plateform`)

Ce fichier décrit les conventions de travail attendues pour intervenir dans `plateform/` (quiz bénévolat).

## Langue

- Rédiger la documentation, les messages de PR et les explications **en français** (cohérence dépôt).

## Périmètre et fichiers à ne pas modifier

Éviter d'éditer/committer directement les éléments suivants :

- `node_modules/`, `build/`, `.react-router/`
- `.env*` (variables d'environnement : potentiellement sensibles)

## Vue d'ensemble

Stack : React Router v7 (framework mode), React 19, TypeScript, DSFR (`@codegouvfr/react-dsfr`), Zustand, Sentry.

Structure notable :

- `app/root.tsx` : layout racine (DsfrProvider, Header, Footer, Outlet).
- `app/entry.client.tsx` : point d'entrée client — initialise DSFR (`startReactDsfr`).
- `app/entry.server.tsx` : point d'entrée serveur — streaming SSR, attente `allReady` pour les bots.
- `app/routes/_index.tsx` : landing page **SSR**, indexée — `loader()` fetchant les missions, `meta()` avec OG tags.
- `app/routes/quiz.$slug.tsx` : quiz **client-side uniquement** — pas de `loader()`, `noindex`, fetch déclenché via `useEffect`.
- `app/routes/missions.tsx` : résultats **client-side uniquement** — missions filtrées selon les réponses du store Zustand.
- `app/components/` : composants UI (quiz, layout).
- `app/stores/quiz.ts` : store Zustand (slug, étape courante, réponses, score).
- `app/services/api.ts` : wrapper fetch côté client.
- `app/services/config.ts` : variables d'env Vite (`import.meta.env`).
- `app/types/quiz.ts` : types partagés (Quiz, Question, Answer, Mission).
- `app/utils/score.ts` : calcul score et catégorisation résultat.

## Conventions SSR vs client

- Une route avec `loader()` est rendue **côté serveur** : son contenu est dans le HTML initial, indexé par Google et les crawlers sociaux.
- Une route **sans** `loader()` est rendue côté client uniquement : utiliser `useEffect` pour les fetches, ajouter `{ name: "robots", content: "noindex, nofollow" }` dans `meta()`.
- Ne jamais accéder à `window`/`localStorage` en dehors d'un `useEffect` ou d'une garde `typeof window !== "undefined"` (SSR).

## DSFR

- `startReactDsfr` est appelé dans `entry.client.tsx` uniquement (côté client).
- Utiliser les composants DSFR natifs : `RadioButtons`, `Button`, `Card`, `Alert`, `Header`, `Footer`.
- Classes utilitaires DSFR dans le JSX (`fr-container`, `fr-grid-row`, etc.) — pas de Tailwind.
- Pas de styles CSS custom sauf usage de variables DSFR (`--blue-france-sun-113-625`, etc.).

## Variables d'environnement

- `VITE_*` : accessibles côté client via `import.meta.env` (voir `app/services/config.ts`).
- Sans préfixe : accessibles côté serveur uniquement dans les `loader()` via `process.env`.
- Ne jamais committer de `.env` ; utiliser `.env.example` comme référence.

## Commandes

Source de vérité : `plateform/package.json`

- Dev : `npm run dev`
- Build : `npm run build`
- Start (prod) : `npm run start`
- Typecheck : `npm run typecheck`
- Lint : `npm run lint` / `npm run lint:fix`

## Sécurité

- Ne jamais ajouter de secrets en dur.
- Valider et encoder les paramètres d'URL avant tout usage.
- Éviter de logguer des données personnelles.
