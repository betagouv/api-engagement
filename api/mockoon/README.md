# Mockoon partenaire

Ce dossier est l'espace de travail de l'equipe API Engagement pour produire le mock offline livre aux partenaires.

Le contenu effectivement livre est dans `package/`. Il est volontairement minimal : l'environnement Mockoon, les fixtures, les exemples, le compose Docker, un smoke test et un README partenaire.

Le contrat fonctionnel detaille reste documente dans `api/docs/openapi.yaml` et dans la documentation GitBook. Il ne doit pas etre duplique ici.

## Generer l'archive partenaire

Depuis la racine du depot :

```bash
api/mockoon/build-archive.sh
```

Le script :

- lit la version dans `api/package.json` ;
- conserve uniquement la version majeure ;
- exporte l'image Docker `mockoon/cli:9.6.1` ;
- ajoute `api/docs/openapi.yaml` au livrable ;
- genere l'archive dans `api/docs/mockoon/`.

Avec `api/package.json` en `1.0.0`, le fichier produit est :

```text
api/docs/mockoon/api-engagement-mockoon-api-v1.tar.gz
```

## Tester localement

Depuis `api/mockoon/package` :

```bash
docker compose -f docker-compose.mock.yml up
```

Dans un autre terminal :

```bash
api/mockoon/package/smoke-test.sh
```

Si le port `3002` est deja utilise, lancer temporairement le conteneur avec un autre port hote et passer `BASE_URL` au smoke test.
