# Instructions agent (API Engagement / `widget`)

Ce fichier décrit les conventions de travail attendues pour intervenir dans `widget/` (widgets bénévolat + volontariat).

## Langue

- Rédiger la documentation, les messages de PR et les explications **en français** (cohérence dépôt).

## Périmètre et fichiers à ne pas modifier

Éviter d’éditer/committer directement les éléments suivants (générés, dépendances, secrets, artefacts) :

- `node_modules/`, `.next/`, `out/`
- `tests/e2e/_test-results/`, `tests/e2e/_playwright-report/`
- `.env*` (variables d’environnement : potentiellement sensibles)

Si une modification nécessite ces fichiers, demander explicitement une validation avant d’aller plus loin.

## Vue d’ensemble

Stack : Next.js (Pages Router), React, TypeScript, Tailwind CSS, Sentry, Plausible.

Structure notable :

- `pages/index.tsx` : page principale du widget (SSR + interactions client, filtres via query params).
- `components/` : UI et filtres (`Filters*`, `Card*`, `Grid`, `Carousel`).
- `types/` : types TS partagés (widgets, missions, filtres).
- `utils/` : store (zustand), resize helper, helpers.
- `config.ts` : config runtime (`API_URL`, `ENV`, `SENTRY_DSN`) via variables d’environnement.

## Conventions de code

- Typage : éviter `any`, privilégier les types dans `types/`.
- SSR/CSR :
  - ne pas accéder à `window`/`document` hors `useEffect` ou garde conditionnelle.
  - éviter les rendus non déterministes entre serveur et client.
- Garder les changements minimaux et ciblés (pas de “refactor” opportuniste).

## Tests (Playwright E2E)

- Les tests sont dans `tests/e2e/` et s’exécutent via `npm run test:e2e`.
- La config Playwright démarre le serveur dev et injecte des URLs d’API mock : garder les tests déterministes/stables multi-navigateurs.
- Pour mettre à jour les snapshots : `npm run test:e2e:update` (vérifier que le diff est attendu).

## Commandes

Source de vérité : `widget/package.json`

- Dev : `npm run dev`
- Build : `npm run build`
- Start : `npm run start`
- Lint : `npm run lint` / `npm run lint:fix`
- Typecheck : `npm run type-check`
- E2E : `npm run test:e2e`

## Sécurité

- Ne jamais ajouter de secrets/DSN en dur ; passer par les variables d’environnement.
- Attention aux query params (validation/encodage) et aux appels externes.
