# [API Engagement](https://api-engagement.beta.gouv.fr)

## Structure

L'api engagement regroupe 3 applications: une api, un back office (ou tableau de bord), et un widget.

### Une [API](https://api.api-engagement.beta.gouv.fr)

L'api est en NodeJs avec expressJS ecrite en TypeScript.
dossier `api/`

Voir le fichier [api/README.md](api/README.md) pour plus d'informations et commandes utiles.

### Un [Back Office](https://app.api-engagement.beta.gouv.fr)

Le back office est une application React avec un serveur ExpressJs en production
dossier `app/`

### Un [Widget Benevolat](https://mission.api-engagement.beta.gouv.fr) et un [Widget Volontariat](https://sc.api-engagement.beta.gouv.fr)

Les deux widgets sont des applications NextJS pour optimiser le SEO
dossier `widget/

## Environnement de développement

Pour lancer tous les services en mode développement, une orchestration avec docker-compose est possible :

```bash
docker-compose up --build
```

Les services seront disponibles sur les ports suivants:

- API : http://localhost:3002
- Back Office : http://localhost:3000
- Widget : http://localhost:3003

Pour arrêter les services :

```bash
docker-compose down
```

## Convention de commits

Les messages de commit doivent respecter le format [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) avec les types et scopes suivants :

- Types autorisés : `feat`, `refactor`, `fix`, `chore`, `test`
- Scopes autorisés : `app`, `api`, `widget`, `jobs`, `ci`

Un message valide doit donc suivre le format `type(scope): message`.

Pour faciliter la rédaction, utilisez l'assistant interactif Commitizen :

```bash
npm run commit
```

Ce script guide la saisie du type, du scope et du message, puis exécute automatiquement le commit formaté.

Une vérification locale est également exécutée grâce à Husky, qui bloque les commits ne respectant pas les règles avant même la CI.
