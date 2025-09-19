# API Engagement - Service API

Ce répertoire contient le service API pour la plateforme API Engagement.

## Installation locale

### Prérequis

- Node.js 18.x ou supérieur
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

### Tests unitaires

Les tests unitaires utilisent des bases de données mockées via `mongodb-memory-server`. Ils peuvent être lancés avec :

```bash
npm run test:unit
```

Pour lancer les tests unitaires en mode watch :

```bash
npm run test:unit:watch
```

La commande `npm test` est un alias de `npm run test:unit`.

### Tests d'intégration

Les tests d'intégration (dossier `tests/integration/`) s'exécutent contre les services PostgreSQL et Elasticsearch. La commande ci-dessous démarre automatiquement l'environnement Docker nécessaire, lance les tests puis arrête l'environnement à la fin :

```bash
npm run test:integration
```

Remarques :
- Docker Desktop (ou équivalent) doit être installé et démarré.
- En mode watch, l'environnement reste actif jusqu'à l'arrêt des tests.
- Pour gérer l'environnement manuellement, vous pouvez utiliser :
  - Démarrer: `npm run testenv:up`
  - Arrêter: `npm run testenv:down`

Un mode watch est également disponible :

```bash
npm run test:integration -- --watch
```

En mode watch, pensez à arrêter les services quand vous avez terminé si nécessaire :

```bash
npm run testenv:down
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
````
