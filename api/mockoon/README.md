# Mockoon API publique partenaires

Ce dossier contient un mock local de l'API publique API Engagement destiné aux partenaires qui font leur recette dans un environnement deconnecte d'internet.

Le mock couvre uniquement les endpoints nécessaires aux tests d'intégration partenaires :

- `GET /v0/mission`
- `GET /v0/mission/search`
- `GET /v0/mission/:id`
- `POST /v2/mission`
- `PUT /v2/mission/:clientId`
- `DELETE /v2/mission/:clientId`

## Objectif et limites

L'objectif est de fournir une API locale stable pour valider les formats de requete et de reponse, les codes HTTP principaux et quelques scenarios d'erreur.

Ce mock ne remplace pas l'API reelle :

- pas de base de donnees ;
- pas de persistance entre les appels ;
- pas de filtrage complet sur `GET /v0/mission` ;
- pas de moderation automatique exhaustive ;
- pas de coherence entre les routes v2 et v0.

La separation entre `/v0/mission` et `/v2/mission` est volontaire :

- `/v2/mission` simule les missions que le partenaire annonceur souhaite envoyer a l'API Engagement ;
- `/v0/mission` expose un jeu fixe de missions exemples que le partenaire diffuseur peut ingerer ;
- une mission creee en v2 n'apparaitra pas dans les resultats v0.

## Structure du dossier

```text
api/mockoon/
├── api-engagement-mockoon.json      # Environnement Mockoon versionne
├── docker-compose.mock.yml          # Lancement local ou partenaire
├── smoke-test.sh                    # Verifications rapides avec curl
├── fixtures/
│   ├── v0-missions.json             # Donnees v0 lisibles
│   ├── v0-mission-list-response.json
│   ├── v0-mission-search-response.json
│   └── v0-mission-paris-001-response.json
└── examples/
    ├── v2-create-mission.json
    └── v2-update-mission.json
```

## Prerequis

Pour l'equipe API Engagement :

- Docker ;
- Docker Compose ;
- acces internet au moment de recuperer l'image `mockoon/cli:9.6.1`, sauf si elle est deja disponible localement.

Pour le partenaire en environnement deconnecte :

- Docker ;
- Docker Compose ;
- une archive livree par l'equipe API Engagement contenant l'image Docker exportee et ce dossier `mockoon`.

Aucune installation Node.js ou npm n'est requise cote partenaire.

## Lancement local

Depuis ce dossier :

```bash
cd api/mockoon
docker compose -f docker-compose.mock.yml up
```

Le mock ecoute sur :

```text
http://localhost:3002
```

La cle API n'est pas verifiee fonctionnellement, mais un header d'authentification doit etre present pour simuler l'API reelle :

```text
x-api-key: mock-api-key
```

ou :

```text
Authorization: Bearer mock-api-key
```

## Exemples curl

Lister les missions v0 :

```bash
curl -sS http://localhost:3002/v0/mission \
  -H "x-api-key: mock-api-key"
```

Rechercher les missions v0 avec facettes :

```bash
curl -sS http://localhost:3002/v0/mission/search \
  -H "x-api-key: mock-api-key"
```

Recuperer une mission v0 connue :

```bash
curl -sS http://localhost:3002/v0/mission/mission-paris-001 \
  -H "x-api-key: mock-api-key"
```

Creer une mission v2 :

```bash
curl -sS -X POST http://localhost:3002/v2/mission \
  -H "x-api-key: mock-api-key" \
  -H "Content-Type: application/json" \
  --data-binary @examples/v2-create-mission.json
```

Modifier une mission v2 :

```bash
curl -sS -X PUT http://localhost:3002/v2/mission/partner-mission-001 \
  -H "x-api-key: mock-api-key" \
  -H "Content-Type: application/json" \
  --data-binary @examples/v2-update-mission.json
```

Supprimer une mission v2 :

```bash
curl -sS -X DELETE http://localhost:3002/v2/mission/partner-mission-001 \
  -H "x-api-key: mock-api-key"
```

## Scenarios d'erreur disponibles

Authentification absente :

```bash
curl -i http://localhost:3002/v0/mission
```

Reponse attendue : `401`, avec `{ "ok": false, "code": "UNAUTHORIZED" }`.

Mission v0 inconnue :

```bash
curl -i http://localhost:3002/v0/mission/unknown-id \
  -H "x-api-key: mock-api-key"
```

Reponse attendue : `404`, avec `{ "ok": false, "code": "NOT_FOUND" }`.

Payload v2 invalide sur creation :

```bash
curl -i -X POST http://localhost:3002/v2/mission \
  -H "x-api-key: mock-api-key" \
  -H "Content-Type: application/json" \
  --data '{}'
```

Reponse attendue : `400`, avec `{ "ok": false, "code": "INVALID_BODY" }`.

Doublon v2 reserve :

```bash
curl -i -X POST http://localhost:3002/v2/mission \
  -H "x-api-key: mock-api-key" \
  -H "Content-Type: application/json" \
  --data '{"clientId":"duplicate-client-id","title":"Mission en doublon"}'
```

Reponse attendue : `409`, avec `{ "ok": false, "code": "RESSOURCE_ALREADY_EXIST" }`.

Mission v2 inconnue documentee :

```bash
curl -i -X PUT http://localhost:3002/v2/mission/unknown-client-id \
  -H "x-api-key: mock-api-key" \
  -H "Content-Type: application/json" \
  --data '{"title":"Titre"}'
```

Reponse attendue : `404`, avec `{ "ok": false, "code": "NOT_FOUND" }`.

Erreur forcee sur update v2 :

```bash
curl -i -X PUT http://localhost:3002/v2/mission/partner-mission-001 \
  -H "x-api-key: mock-api-key" \
  -H "Content-Type: application/json" \
  --data '{"forceError":"INVALID_BODY"}'
```

Reponse attendue : `400`, avec `{ "ok": false, "code": "INVALID_BODY" }`.

## Smoke test

Une fois le mock lance :

```bash
cd api/mockoon
./smoke-test.sh
```

Il est possible de cibler une autre URL :

```bash
BASE_URL=http://localhost:3002 ./smoke-test.sh
```

Le script verifie les endpoints principaux et echoue des qu'un code HTTP ou un fragment de reponse attendu est absent.

## Process de livraison offline

Ces commandes sont a executer par l'equipe API Engagement sur une machine qui dispose d'internet et de Docker.

1. Recuperer l'image Mockoon CLI pinnee :

```bash
docker pull mockoon/cli:9.6.1
```

2. Exporter l'image Docker :

```bash
docker save mockoon/cli:9.6.1 -o mockoon-cli-9.6.1.tar
```

3. Preparer une archive partenaire depuis la racine du depot :

```bash
tar -czf api-engagement-mockoon-partenaire.tar.gz \
  -C api mockoon \
  -C .. mockoon-cli-9.6.1.tar
```

Si la commande `tar` ci-dessus n'est pas adaptee a votre repertoire courant, l'archive doit simplement contenir :

- `mockoon-cli-9.6.1.tar` ;
- `mockoon/api-engagement-mockoon.json` ;
- `mockoon/docker-compose.mock.yml` ;
- `mockoon/fixtures/` ;
- `mockoon/examples/` ;
- `mockoon/smoke-test.sh` ;
- `mockoon/README.md`.

4. Transmettre `api-engagement-mockoon-partenaire.tar.gz` au partenaire via le canal convenu.

5. Cote partenaire, extraire l'archive :

```bash
tar -xzf api-engagement-mockoon-partenaire.tar.gz
```

6. Charger l'image Docker :

```bash
docker load -i mockoon-cli-9.6.1.tar
```

7. Lancer le mock :

```bash
cd mockoon
docker compose -f docker-compose.mock.yml up
```

8. Dans un autre terminal, executer les smoke tests :

```bash
./smoke-test.sh
```

## Mise a jour des fixtures

Pour faire evoluer le jeu de missions expose en v0 :

1. modifier `fixtures/v0-missions.json` pour garder une version lisible du dataset ;
2. reporter les changements dans les fichiers de reponse servis par Mockoon :
   - `fixtures/v0-mission-list-response.json` ;
   - `fixtures/v0-mission-search-response.json` ;
   - `fixtures/v0-mission-paris-001-response.json` si la mission de detail change ;
3. lancer le mock et `./smoke-test.sh`.

Les reponses doivent rester alignees avec `api/docs/openapi.yaml` pour les enveloppes principales.
