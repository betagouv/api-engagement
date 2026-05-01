# Mock API Engagement offline

Cette archive contient un mock local de l'API publique API Engagement pour les recettes partenaires sans acces internet.

Le mock est base sur Mockoon et expose un jeu de reponses stable. Il ne remplace pas l'API reelle : il ne persiste pas les donnees et les ecritures `/v2/mission` ne modifient pas les lectures `/v0/mission`.

La specification detaillee de l'API est incluse dans l'archive :

```text
docs/openapi.yaml
```

## Prerequis

- Docker
- Docker Compose

Aucune installation Node.js ou npm n'est necessaire.

## Installation

Charger l'image Docker fournie dans l'archive :

```bash
docker load -i ../mockoon-cli-9.6.1.tar
```

Demarrer le mock :

```bash
docker compose -f docker-compose.mock.yml up
```

Le mock ecoute par defaut sur :

```text
http://localhost:3002
```

## Verification

Dans un autre terminal, lancer :

```bash
./smoke-test.sh
```

Si le mock est expose sur une autre URL :

```bash
BASE_URL=http://localhost:3012 ./smoke-test.sh
```

Toutes les requetes de test utilisent le header suivant :

```text
x-api-key: mock-api-key
```

## Limites

- pas de base de donnees ;
- pas de persistance entre les appels ;
- pas de filtrage complet des listes ;
- pas de moderation automatique exhaustive ;
- pas de coherence d'etat entre `/v2/mission` et `/v0/mission`.
