# API Engagement - Service API

Ce répertoire contient le service API pour la plateforme API Engagement.

## Installation locale

### Prérequis

- Node.js 24.x
- MongoDB (instance locale via docker-compose ou distante)
- Postgres (instance locale via docker-compose ou distante)
- npm

### Étapes d'installation

1. Cloner le dépôt (si ce n'est pas déjà fait)

```bash
git clone https://github.com/betagouv/api-engagement.git
cd api-engagement/api
```

2. Installer les dépendances

```bash
npm install
```

3. Créer un fichier `.env` basé sur l'exemple fourni (ou demander à un membre de l'équipe les variables d'environnement de développement).

NB : un fichier `.env` peut être créé pour chaque environnement (staging, production) : `.env.staging`, `.env.production`.

4. Initialiser la base de données

Lancer les migrations :

```bash
npx prisma migrate dev --name init
```

### Jeux de données

On peut remplir les bases de données avec des jeux de données en provenance de staging.

#### MongoDB

```bash
MONGO_STAGING_URI="mongodb+srv://..."
MONGO_LOCAL_URI="mongodb://localhost:27017/api-engagement"

mongodump --uri="$MONGO_STAGING_URI" --archive=dump.archive
mongorestore --uri="$MONGO_LOCAL_URI" --archive=dump.archive --drop
```

#### PostgreSQL

```bash
PG_STAGING_URI="postgres://user:pass@host/db"
PG_LOCAL_URI="postgres://user:password@localhost:5432/api-engagement"

pg_dump "$PG_STAGING_URI" | psql "$PG_LOCAL_URI"
```

## Mode développement

### Lancement du service API

Pour démarrer le service API en mode développement avec rechargement à chaud :

```bash
npm run dev
```

Cela démarrera le serveur API en utilisant nodemon, qui redémarrera automatiquement lorsque des modifications de fichiers seront détectées.

### Exécution d'une tâche spécifique

Pour exécuter manuellement une tâche spécifique :

```bash
npm run job -- <job-name> <json-params> --env <env>
```

Exemple :

```bash
npm run job -- letudiant "{\"limit\": 100}" --env staging
```

### Lancement du worker asynchrone

Le worker est un processus Express séparé qui consomme les messages SQS et exécute les handlers correspondants. Pour le lancer en mode développement avec rechargement à chaud :

```bash
npm run dev:worker
```

Il écoute sur le port défini par la variable `PORT_WORKER` (défaut : 8080).

### Exécuter un handler directement (sans SQS)

Pour invoquer un handler du worker en local sans passer par la file SQS (utile pour déboguer ou tester) :

```bash
npm run worker:run -- <type> '<json-payload>'
```

Exemple :

```bash
npm run worker:run -- mission.enrichment '{"missionId":"abc123"}'
```

Les types disponibles correspondent aux clés du `taskRegistry` (`src/worker/registry.ts`). Un message d'erreur explicite est affiché si le type est inconnu ou si le payload ne correspond pas au schéma attendu.

### Rejeu des Dead Letter Queues (DLQ)

Chaque queue SQS dispose d'une **Dead Letter Queue** (`<queue>-dlq`) vers laquelle un message bascule après plusieurs échecs de traitement (10 tentatives). Le job **`process-dead-letter-queues`** permet de rejouer ces messages, typiquement après correction de la cause racine.

Pour chaque queue traitée, le job lit (pull) sa DLQ et **republie chaque message sur la queue source**. Un message n'est **supprimé de la DLQ qu'après un rejeu réussi** ; un message illisible, de type inconnu ou dont le rejeu échoue est conservé (et remonté dans Sentry).

```bash
# Rejouer toutes les DLQ
npm run job -- process-dead-letter-queues --env staging

# Cibler une seule queue
npm run job -- process-dead-letter-queues '{"taskType":"mission.index"}' --env staging

# Inspecter sans rien modifier (lecture seule)
npm run job -- process-dead-letter-queues '{"dryRun":true}' --env staging

# Tester sur un seul message
npm run job -- process-dead-letter-queues '{"taskType":"mission.index","max":1}' --env staging
```

Paramètres (tous optionnels) :

| Paramètre  | Défaut | Description                                                                                  |
| ---------- | ------ | ------------------------------------------------------------------------------------------- |
| `taskType` | —      | Clé du `taskRegistry` à traiter (ex. `mission.index`). Absent → toutes les DLQ sont drainées. |
| `max`      | `1000` | Nombre maximum de messages traités **par queue** (`1` pour tester un seul message).          |
| `dryRun`   | `false`| Lit et compte les messages sans republier ni supprimer.                                      |

Détails d'implémentation :

- `src/jobs/process-dead-letter-queues/handler.ts` — orchestration (sélection des queues, boucle de lecture, agrégation des compteurs `received / replayed / skipped`).
- `src/services/async-task/dlq-consumer.ts` — `DlqConsumer` dédié (`receive` / `delete` / `getQueueUrl`), isolé du bus qui reste *publish-only*.
- Le nom de la DLQ est dérivé de la queue source : `SCW_QUEUE_URL_<NOM>` doit donc pointer sur la **queue source** (le job ajoute lui-même le suffixe `-dlq`), qui est aussi la cible du rejeu.
- Côté infra, le job (`scaleway_job_definition`) tourne avec une credential dédiée `async_task_dlq_processor` (droits `receive` + `publish`).

## Mode production

### Compilation pour la production

Pour compiler l'application pour la production :

```bash
npm run build
```

### Exécution en production

Pour démarrer le service API en mode production :

```bash
npm run start
```

````

## Tests

### Exécution des tests

Pour exécuter tous les tests une fois :

```bash
npm test
````

Pour exécuter les tests en mode watch pendant le développement :

```bash
npm run test:watch
```

Pour exécuter les tests dans un environnement CI (optimisé pour les pipelines CI) :

```bash
npm run test:ci
```

## Autres commandes

### Linting

Pour vérifier la qualité du code avec ESLint :

```bash
npm run lint
```

Pour corriger automatiquement les problèmes de linting :

```bash
npm run lint:fix
```

### Formatage du code

Pour formater le code avec Prettier :

```bash
npm run prettier
```
