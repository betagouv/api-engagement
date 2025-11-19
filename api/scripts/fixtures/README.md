# Fixtures

Scripts utilitaires pour insérer des données de démonstration directement dans la base. Ils se lancent depuis `api/` avec `npx ts-node`.

## `populate-stat-events-from-missions.ts`

- **Objectif**: créer des `StatEvent` réalistes sur les 3 derniers mois pour un ou plusieurs publishers (par défaut `JEVEUXAIDER` et `JAGIS_POUR_LA_NATURE`), à partir de missions réellement présentes en base (Mongo).
- **Prérequis**:
  - Accès Mongo (`DB_ENDPOINT`) et Postgres (`DB_ENDPOINT`, `prismaCore`) configurés.
  - `npm install` déjà effectué (ts-node, prisma).
- **Commandes**:
  ```bash
  # Aperçu des données générées
  cd api
  npx ts-node scripts/fixtures/populate-stat-events-from-missions.ts --dry-run

  # Insertion réelle (par défaut 25 StatEvents par type et par publisher cible)
  npx ts-node scripts/fixtures/populate-stat-events-from-missions.ts

  # Modifier le volume (ex: 40 événements par type)
  npx ts-node scripts/fixtures/populate-stat-events-from-missions.ts --per-type 40

  # Cibler un publisher précis
  npx ts-node scripts/fixtures/populate-stat-events-from-missions.ts --publisher-id 5f5931496c7ea514150a818f
  ```
- **Options**:
  - `--dry-run`: affiche un exemple d’événement sans l’enregistrer.
  - `--per-type <n>`: nombre d’événements par type (`click`, `print`, `apply`, `account`). Valeur min 1, max 500 (défaut 25).
  - `--publisher-id <id>`: limite l’exécution à un publisher spécifique (sinon la liste par défaut est utilisée).

Chaque exécution prélève aléatoirement des missions actives du publisher ciblé dans Mongo, génère des `StatEvent` en utilisant `statEventService.createStatEvent`, puis ferme proprement les connexions Prisma/Mongoose.
