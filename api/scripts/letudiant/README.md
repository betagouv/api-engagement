# Scripts L'Étudiant / Piloty

Scripts utilitaires liés à l’intégration Piloty.

## Prérequis

- Node.js 24+
- Variables d’environnement: `LETUDIANT_PILOTY_TOKEN` (token API Piloty)
- Accès MongoDB si nécessaire
- Chargement d’un fichier `.env` possible via `--env <nom|chemin>` (ex: `.env.local`, `.env.production`)

## Commandes

- **archive-piloty-jobs.ts**
  - Exécution: `npx ts-node scripts/letudiant/archive-piloty-jobs.ts [--env <nom|chemin>]`
  - Usage: Archive des offres côté Piloty à partir d’une liste d’identifiants publics (liste à éditer directement dans le script).
  - Notes:
    - Nécessite `LETUDIANT_PILOTY_TOKEN`.
