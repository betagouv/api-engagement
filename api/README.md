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
