# Instructions agent (API Engagement / `plateform`)

Ce fichier décrit les conventions de travail attendues pour intervenir dans `plateform/` (quiz bénévolat).

## Langue

- Rédiger la documentation, les messages de PR et les explications **en français** (cohérence dépôt).

## Périmètre et fichiers à ne pas modifier

Éviter d'éditer/committer directement les éléments suivants :

- `node_modules/`, `build/`, `.react-router/`
- `.env*` (variables d'environnement : potentiellement sensibles)

## Vue d'ensemble

Stack : React Router v7 (framework mode), React 19, TypeScript, DSFR vanilla (`@gouvfr/dsfr` — CSS/assets uniquement, pas de wrappers React), Zustand, Sentry.

Structure notable :

- `app/root.tsx` : layout racine (DsfrProvider, Header, Footer, Outlet).
- `app/entry.client.tsx` : point d'entrée client — hydratation React Router uniquement.
- `app/entry.server.tsx` : point d'entrée serveur — streaming SSR, attente `allReady` pour les bots.
- `app/routes/_index.tsx` : landing page **SSR**, indexée — `loader()` fetchant les missions, `meta()` avec OG tags.
- `app/routes/quiz.$slug.tsx` : quiz **client-side uniquement** — pas de `loader()`, `noindex`, fetch déclenché via `useEffect`.
- `app/routes/missions.tsx` : résultats **client-side uniquement** — missions filtrées selon les réponses du store Zustand.
- `app/components/` : composants UI (quiz, layout).
- `app/stores/quiz.ts` : store Zustand (slug, étape courante, réponses, score).
- `app/services/api.ts` : client HTTP isomorphe (SSR + client) — `api.get/post/put<T>(path, …)`, déroule l'enveloppe v0 `{ ok, data, … }` et injecte l'auth `apikey` automatiquement.
- `app/services/config.ts` : variables d'env Vite (`import.meta.env.VITE_*`).
- `app/types/quiz.ts` : types partagés (Quiz, Question, Answer, Mission).
- `app/utils/score.ts` : calcul score et catégorisation résultat.

## Conventions SSR vs client

- Une route avec `loader()` est rendue **côté serveur** : son contenu est dans le HTML initial, indexé par Google et les crawlers sociaux.
- Une route **sans** `loader()` est rendue côté client uniquement : utiliser `useEffect` pour les fetches, ajouter `{ name: "robots", content: "noindex, nofollow" }` dans `meta()`.
- Ne jamais accéder à `window`/`localStorage` en dehors d'un `useEffect` ou d'une garde `typeof window !== "undefined"` (SSR).

## DSFR

- `@gouvfr/dsfr` fournit uniquement le CSS, les polices (Marianne/Spectral) et les favicons ; pas de composants React ni de JS.
- CSS importé dans `app/root.tsx` : `@gouvfr/dsfr/dist/dsfr.min.css` + `@gouvfr/dsfr/dist/utility/utility.min.css`.
- Attribut `data-fr-scheme="system"` posé sur `<html>` pour activer le thème auto.
- Écrire les composants en HTML DSFR direct (`fr-header`, `fr-footer`, `fr-fieldset`, `fr-radio-group`, `fr-btn`, `fr-card`, `fr-stepper`, etc.).
- Les composants interactifs DSFR (menu mobile, modales, switcher de thème) nécessitent d'importer `@gouvfr/dsfr/dist/dsfr.module.min.js` côté client ; non activé aujourd'hui.
- Pas de styles CSS custom sauf usage de variables DSFR (`--blue-france-sun-113-625`, etc.).

## Tailwind

- Tailwind v4 cohabite avec DSFR via `app/main.css` (plugin `@tailwindcss/vite` dans `vite.config.ts`).
- **Préfixe obligatoire `tw`** sur tous les utilitaires, avec `:` comme séparateur (spécifique v4, différent de v3) : `tw:flex`, `tw:gap-4`, `tw:hover:bg-red-500`. Cela évite les collisions avec les classes `fr-*`.
- Preflight de Tailwind est chargé mais rangé dans `@layer base` ; le CSS DSFR étant hors layer, il l'emporte naturellement et le reset DSFR reste en place.
- Privilégier les classes DSFR (`fr-grid-row`, `fr-container`, `fr-p-*w`) quand elles existent ; Tailwind pour les ajustements hors catalogue DSFR.

## Variables d'environnement

- `VITE_*` : accessibles côté client via `import.meta.env` (voir `app/services/config.ts`).
- Sans préfixe : accessibles côté serveur uniquement dans les `loader()` via `process.env`.
- Ne jamais committer de `.env` ; utiliser `.env.example` comme référence.

### API (auth & URL)

- `api.ts` lit la base URL et l'`apikey` selon le contexte :
  - SSR/loader : `process.env.API_URL` / `process.env.API_KEY` (secrets non exposés au bundle).
  - Client : `VITE_API_URL` / `VITE_API_KEY` (⚠️ inlinés dans le bundle → visibles dans le navigateur).
- Les routes `/v0/*` requièrent un `apikey` en header. Pour les appels **client-side uniquement**, exposer une clé via `VITE_API_KEY` est acceptable en POC mais fuite la clé ; préférer à terme une resource route React Router qui proxifie avec la clé serveur.

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
