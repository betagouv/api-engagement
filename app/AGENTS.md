# Instructions agent (API Engagement / `app`)

Ce fichier décrit les conventions de travail attendues pour intervenir dans `app/` (back-office / dashboard).

## Langue

- Rédiger la documentation, les messages de PR et les explications **en français** (cohérence dépôt).

## Périmètre et fichiers à ne pas modifier

Éviter d’éditer/committer directement les éléments suivants (générés, dépendances, secrets) :

- `node_modules/`, `dist/`
- `.env*` (variables d’environnement : potentiellement sensibles)

Si une modification nécessite ces fichiers, demander explicitement une validation avant d’aller plus loin.

## Vue d’ensemble

Stack : Vite + React (JSX), React Router, Tailwind CSS, Zustand, Sentry.

Structure notable :

- `src/App.jsx` : routing + layouts (public/auth/protected/admin).
- `src/scenes/` : pages métier (auth, performance, broadcast, admin, etc.).
- `src/components/` : composants UI partagés.
- `src/services/` :
  - `api.js` : wrapper `fetch` (base URL + header JWT + gestion 401/logout).
  - `config.js` : config Vite (`VITE_API_URL`, `VITE_ENV`, …).
  - `error.js` : helpers toast + Sentry (`captureError`) ; ignore `AbortError`, évite le bruit sur les erreurs d’auth.
  - `store.js` : store zustand (auth/publisher/flux).
- `server/index.js` : serveur Express de prod pour servir `dist/` (et redirect legacy `/linkedin.xml`).

## Conventions de code

- Utiliser `src/services/api.js` au lieu de `fetch` ad hoc (auth + gestion erreurs cohérentes).
- Utiliser `src/services/error.js` (`captureError`) pour le reporting utilisateur + Sentry.
- Garder les décisions de routing cohérentes avec `src/App.jsx` (layouts + contrôle d’accès).
- Garder les changements minimaux et ciblés (éviter les reformatages/cleanups massifs).

## Variables d’environnement

La config exposée par Vite est lue via `import.meta.env` (voir `src/services/config.js`) :

- `VITE_API_URL`, `VITE_ENV`
- `VITE_BENEVOLAT_URL`, `VITE_VOLONTARIAT_URL`
- `VITE_SENTRY_DSN`

Ne pas committer de `.env` ; utiliser un `.env.example` si présent.

## Commandes

Source de vérité : `app/package.json`

- Dev : `npm run dev`
- Build : `npm run build`
- Start (serveur prod) : `npm run start`
- Format : `npm run prettier`

## Sécurité

- Ne jamais ajouter de secrets/DSN en dur.
- Éviter de logguer des données personnelles ; préférer des IDs et du contexte technique.
