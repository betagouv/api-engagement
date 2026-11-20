---
description: >-
  L'API association facilite la recherche, la consultation et la mise à jour de
  la base des établissements liés aux associations. Une association contient un
  ou plusieurs établissements.
hidden: true
---

# /association

## Rechercher des établissements

<mark style="color:green;">`POST`</mark> `https://api.api-engagement.beta.gouv.fr/v1/association/search`

Retourne les établissements via le nom de l'établissement.

#### Headers

***

<table><thead><tr><th width="176">Name</th><th width="102">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>apikey</code> <mark style="color:red;">requis</mark></td><td><code>string</code></td><td>La clé API <strong>nécessaire à l’authentification</strong>. Les données disponibles sont définies en fonction de votre clé API.</td></tr></tbody></table>

#### Request Body

***

<table><thead><tr><th>Name</th><th width="216">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>name</code></td><td><code>string</code></td><td>Nom de l'association recherchée</td></tr><tr><td><code>minScore</code></td><td><code>number</code></td><td>Score de correspondance minimal attendu </td></tr><tr><td><code>city</code></td><td><code>string</code></td><td>Ville de l'association</td></tr><tr><td><code>size</code></td><td><code>number</code></td><td>Nombre de résultats maximum retournés</td></tr></tbody></table>

{% tabs %}
{% tab title="200 OK" %}
```
{
  "ok": true,
  "data": [
    {
      "_id": "5f97ec98ab4bb01cb31de652",
      "rna": "W061001494",
      "name": "A DEMI-MOT",
      "regime": "loi1901",
      "theme": "Culture",
      "famille": "culture, pratiques d'activités artistiques, culturelles ",
      "est_etablissement_secondaire": false,
      "coordonnees": {
        "adresse": {
          "nom_complet": "5 Rue de la Laïta 44400 Rezé",
          "nom": "5 Rue de la Laïta",
          "code_postal": "44400",
          "code_insee": "44143",
          "rue": "Rue de la Laïta",
          "numero": "5",
          "commune": "Rezé",
          "commune_ancienne": "",
          "contexte": "44, Loire-Atlantique, Pays de la Loire",
          "departement_numero": "44",
          "departement": "Loire-Atlantique",
          "region": "Pays de la Loire",
          "type": "housenumber"
        },
        "telephone": [],
        "courriel": []
      },
      "objet": "promotion des échanges culturels et mélange entre différentes expressions artistiques (conte musique théâtre)",
      "score": 22.872053
    },
    {
      "_id": "5f9bed4d1087da3c1bae6cda",
      "rna": "W442016188",
      "name": "L'IMAGE A UN SENS",
      "regime": "loi1901",
      "theme": "Culture",
      "famille": "culture, pratiques d'activités artistiques, culturelles ",
      "est_etablissement_secondaire": false,
      "coordonnees": {
        "adresse": {
          "nom_complet": "29 Rue Etienne Lemerle 44400 Rezé",
          "nom": "29 Rue Etienne Lemerle",
          "code_postal": "44400",
          "code_insee": "44143",
          "rue": "Rue Etienne Lemerle",
          "numero": "29",
          "commune": "Rezé",
          "commune_ancienne": "",
          "contexte": "44, Loire-Atlantique, Pays de la Loire",
          "departement_numero": "44",
          "departement": "Loire-Atlantique",
          "region": "Pays de la Loire",
          "type": "housenumber"
        },
        "telephone": [
          "0683527271"
        ],
        "courriel": []
      },
      "objet": "soutenir, créer et produire des films cinéma (courts-métrages, documentaires, etc.) pour favoriser et encourager une culture de l'image pour tous",
      "score": 22.577662
    }
  ]
}
```
{% endtab %}
{% endtabs %}

## Mettre à jour un établissement

<mark style="color:orange;">`PUT`</mark> `https://api.api-engagement.beta.gouv.fr/v1/association/:idRna/etablissement/:id`

Enrichit les données d'un établissement au sein d'une association. Ces modifications permettent de mettre à jour un établissement sans modifier tous les établissement de l'association à laquelle il appartient. La modification de la description d'un établissement n'aura pas d'impact sur la description des autres établissement. Pour mettre à jour la description de toute une association, utiliser la route décrite plus bas.

#### Path Parameters

<table><thead><tr><th>Name</th><th width="140">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>id</code></td><td><code>string</code></td><td>Identifiant de l'établissement</td></tr><tr><td><code>idRna</code></td><td><code>string</code></td><td>Identifiant de l'association.</td></tr></tbody></table>

#### Headers

<table><thead><tr><th width="191">Name</th><th width="135">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>apikey</code> <mark style="color:red;">requis</mark></td><td><code>string</code></td><td>La clé API <strong>nécessaire à l’authentification</strong>. Les données disponibles sont définies en fonction de votre clé API.</td></tr></tbody></table>

#### Request Body

<table><thead><tr><th width="264">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>facebook</code></td><td><code>string</code></td><td>URL facebook</td></tr><tr><td><code>linkedin</code></td><td><code>string</code></td><td>URL linkedin</td></tr><tr><td><code>logo</code></td><td><code>string</code></td><td>URL vers l'image du logo</td></tr><tr><td><code>url</code></td><td><code>string</code></td><td>Site web</td></tr><tr><td><code>twitter</code></td><td><code>string</code></td><td>URL twitter</td></tr><tr><td><code>description</code></td><td><code>string</code></td><td>description de l'établissement</td></tr><tr><td><code>publics_beneficiaires</code></td><td><code>array</code></td><td>Publics visés. Exemple : "Tous publics"</td></tr><tr><td><code>statut_juridique</code></td><td><code>string</code></td><td>Statut juridique</td></tr><tr><td><code>coordonnees</code></td><td><code>string</code></td><td>Objet représentant les coordonnées à destination du public de l'association. L'adresse respecte le format de l'API adresse. Exemple : <br><code>"coordonnees": {</code> <br>  <code>"adresse": {</code> <br>    <code>"nom_complet": "29 Rue Etienne Lemerle 44400 Rezé",</code> <br>    <code>"nom": "29 Rue Etienne Lemerle",</code> <br>    <code>"code_postal": "44400",</code> <br>    <code>"code_insee": "44143",</code><br>    <code>"rue": "Rue Etienne Lemerle",</code> <br>    <code>"numero": "29",</code> <br>    <code>"commune": "Rezé",</code> <br>    <code>"commune_ancienne": "",</code> <br>    <code>"contexte": "44, Loire-Atlantique, Pays de la Loire",</code> <br>    <code>"departement_numero": "44",</code> <br>    <code>"departement": "Loire-Atlantique",</code> <br>    <code>"region": "Pays de la Loire",</code> <br>    <code>"type": "housenumber"</code> <br>  <code>},</code> <br>  <code>"telephone": [ "0683527271" ],</code> <br>  <code>"courriel": []</code> <br><code>}</code></td></tr><tr><td><code>domaines</code></td><td><code>array</code></td><td>Liste des domaines de l'association (ex: "Protection de la nature", "Mémoire et citoyenneté")</td></tr><tr><td><code>donation</code></td><td><code>string</code></td><td>URL pour les dons à l'association</td></tr></tbody></table>

{% tabs %}
{% tab title="200 " %}
```
{
  "ok": true,
  "data": {
    "_id": "5f97eddeab4bb01cb31df22a",
    "rna": "W061003010",
    "name": "CENTRE EUROPEEN DE FORMATION AUX METIERS DU SPORT ET DE L'ANIMATION (CEFAMS)",
    "regime": "loi1901",
    "theme": "Sport",
    "famille": "Sports, activités de plein air ",
    "domaines": [
      "test"
    ],
    "statut_juridique": "test",
    "publics_beneficiaires": [
      "test"
    ],
    "est_etablissement_secondaire": false,
    "coordonnees": {
      "adresse": {
        "location": {
          "lon": 6.944482,
          "lat": 43.643349
        },
        "nom_complet": "50 Route de Cannes 06130 Grasse",
        "nom": "50 Route de Cannes",
        "code_postal": "06130",
        "code_insee": "06069",
        "rue": "Route de Cannes",
        "numero": "50",
        "commune": "Grasse",
        "commune_ancienne": "",
        "contexte": "06, Alpes-Maritimes, Provence-Alpes-Côte d'Azur",
        "departement_numero": "06",
        "departement": "Alpes-Maritimes",
        "region": "Provence-Alpes-Côte d'Azur",
        "type": "housenumber"
      },
      "telephone": [
        "0102030405"
      ],
      "courriel": [
        "test@example.org"
      ]
    },
    "objet": "formation et préformation aux métiers de la forme et aux métiers du sport de mettre en place des actions d'aménagement du temps de travail scolaire et périscolaires dans le secteur des aps",
    "description": "hello desc",
    "logo": "http://logo.fr",
    "twitter": "http://donation.fr",
    "donation": "http://donation.fr/df"
  }
}
```
{% endtab %}
{% endtabs %}

## Mettre à jour une association

<mark style="color:orange;">`PUT`</mark> `https://api.api-engagement.beta.gouv.fr/v1/association/:idRna`

Enrichir les données d'une association via son identifiant RNA. Ces modifications seront appliquées **sur tous les établissements**.

#### Path Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `idRna` | `string` | ID RNA      |

#### Headers

| Name                                            | Type     | Description                                     |
| ----------------------------------------------- | -------- | ----------------------------------------------- |
| `apikey` <mark style="color:red;">requis</mark> | `string` | La clé API **nécessaire à l’authentification**. |

#### Request Body

<table><thead><tr><th width="267">Name</th><th width="108">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>coordonnees</code></td><td><code>object</code></td><td>Objet représentant les coordonnées à destination du public de l'association. L'adresse respecte le format de l'API adresse.<br>Exemple :<br><code>"coordonnees": {</code> <br>  <code>"adresse": {</code> <br>    <code>"nom_complet": "29 Rue Etienne Lemerle 44400 Rezé",</code> <br>    <code>"nom": "29 Rue Etienne Lemerle",</code> <br>    <code>"code_postal": "44400",</code><br>    <code>"code_insee": "44143",</code> <br>    <code>"rue": "Rue Etienne Lemerle",</code> <br>    <code>"numero": "29", "commune": "Rezé",</code> <br>    <code>"commune_ancienne": "",</code> <br>    <code>"contexte": "44, Loire-Atlantique, Pays de la Loire",</code> <br>    <code>"departement_numero": "44",</code> <br>    <code>"departement": "Loire-Atlantique",</code> <br>    <code>"region": "Pays de la Loire",</code> <br>    <code>"type": "housenumber"</code> <br>  <code>},</code> <br>  <code>"telephone": [ "0683527271" ],</code> <br>  <code>"courriel": []</code> <br><code>}</code></td></tr><tr><td><code>donation</code></td><td><code>string</code></td><td>URL pour les dons à l'association</td></tr><tr><td><code>domaines</code></td><td><code>array</code></td><td>Liste des domaines de l'association (ex: "Protection de la nature", "Mémoire et citoyenneté")</td></tr><tr><td><code>statut_juridique</code></td><td><code>string</code></td><td>Statut juridique</td></tr><tr><td><code>publics_beneficiaires</code></td><td><code>array</code></td><td>Publics visés (ex: "Tous publics")</td></tr><tr><td><code>description</code></td><td><code>string</code></td><td>Description de l'association</td></tr><tr><td><code>url</code></td><td><code>string</code></td><td>URL du site de l'association</td></tr><tr><td><code>facebook</code></td><td><code>string</code></td><td>URL facebook de l'association</td></tr><tr><td><code>twitter</code></td><td><code>string</code></td><td>URL twitter de l'association</td></tr><tr><td><code>linkedin</code></td><td><code>string</code></td><td>URL linkedin de l'association</td></tr><tr><td><code>logo</code></td><td><code>string</code></td><td>URL du logo (JPEG, PNG) de l'association</td></tr></tbody></table>

{% tabs %}
{% tab title="200 OK" %}
```
{
  "ok": true,
  "data": {
    "rna": "W061003010",
    "name": "CENTRE EUROPEEN DE FORMATION AUX METIERS...",
    "regime": "loi1901",
    "theme": "Sport",
    "famille": "Sports, activités de plein air ",
    "domaines": [
      "test"
    ],
    "statut_juridique": "test",
    "publics_beneficiaires": [
      "test"
    ],
    "coordonnees": {
      "adresse_siege": {
        "num_voie": "50",
        "code_type_voie": "RTE",
        "type_voie": "route",
        "code_type_voie_insee": "RTE",
        "voie": "de Cannes",
        "cp": "06130",
        "commune": "Grasse"
      },
      "adresse_publique": {
        "latitude_longitude": {
          "lat": 43.6438108,
          "lon": 6.9427333
        },
        "voie": "50 route de Cannes",
        "cp": "06130",
        "commune": "Grasse",
        "departement": "75"
      },
      "telephone": "0102030405",
      "courriel": "test@example.org"
    },
    "objet": "formation et préformation aux métiers de la...",
    "logo": "http://logo.fr"
  }
}
```
{% endtab %}

{% tab title="400 Bad Request" %}
```
{
  "ok": false,
  "code": "INVALID_PARAMS"
}
```
{% endtab %}

{% tab title="404 Not Found" %}
```
{
  "ok": false,
  "code": "NOT_FOUND"
}
```
{% endtab %}
{% endtabs %}

## Liste des établissement d'une association

<mark style="color:blue;">`GET`</mark> `https://api.api-engagement.beta.gouv.fr/v1/association/:idRna`

Lister les établissements d'une association

#### Path Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `idRna` | `string` | ID RNA      |

#### Headers

<table><thead><tr><th width="191">Name</th><th width="138">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>apikey</code> <mark style="color:red;">requis</mark></td><td><code>string</code></td><td>La clé API <strong>nécessaire à l’authentification</strong>.</td></tr></tbody></table>

{% tabs %}
{% tab title="200 OK" %}
```
{
  "ok": true,
  "data": [
    {
      "_id": "5f9bed4d1087da3c1bae6cda",
      "rna": "W442016188",
      "name": "L'IMAGE A UN SENS",
      "regime": "loi1901",
      "theme": "Culture",
      "famille": "culture, pratiques d'activités artistiques, culturelles ",
      "est_etablissement_secondaire": false,
      "coordonnees": {
        "adresse": {
          "location": {
            "lon": -1.563556,
            "lat": 47.187578
          },
          "nom_complet": "29 Rue Etienne Lemerle 44400 Rezé",
          "nom": "29 Rue Etienne Lemerle",
          "code_postal": "44400",
          "code_insee": "44143",
          "rue": "Rue Etienne Lemerle",
          "numero": "29",
          "commune": "Rezé",
          "commune_ancienne": "",
          "contexte": "44, Loire-Atlantique, Pays de la Loire",
          "departement_numero": "44",
          "departement": "Loire-Atlantique",
          "region": "Pays de la Loire",
          "type": "housenumber"
        },
        "telephone": [
          "0683527271"
        ],
        "courriel": []
      },
      "objet": "soutenir, créer et produire des films cinéma (courts-métrages, documentaires, etc.) pour favoriser et encourager une culture de l'image pour tous"
    }
  ]
}
```
{% endtab %}
{% endtabs %}

## Obtenir un établissement

<mark style="color:blue;">`GET`</mark> `https://api.api-engagement.beta.gouv.fr/v1/association/:idRna/etablissement/:id`

Obtenir les infos sur un établissement en particulier

#### Path Parameters

| Name    | Type     | Description                    |
| ------- | -------- | ------------------------------ |
| `idRna` | `string` | Identifiant de l'association   |
| `id`    | `string` | Identifiant de l'établissement |

#### Headers

<table><thead><tr><th width="185">Name</th><th width="108">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>apikey</code> <mark style="color:red;">requis</mark></td><td><code>string</code></td><td>La clé API <strong>nécessaire à l’authentification</strong>.</td></tr></tbody></table>

{% tabs %}
{% tab title="200 OK" %}
```
{
  "ok": true,
  "data": {
    "_id": "5f974d1e37e975042c8a8434",
    "rna": "W011001103",
    "name": "LA PLATE-FORME - COMITE DE PROMOTION DE LA REGION D'AMBERIEU EN BUGEY POUR L'IMPLANTATION D'UNE PLATE-FORME DE FERROUTAGE",
    "regime": "loi1901",
    "theme": "Economie et développement local",
    "famille": "représentation, promotion et défense d'intérêts économiques ",
    "est_etablissement_secondaire": false,
    "coordonnees": {
      "adresse": {
        "location": {
          "lon": 5.36516,
          "lat": 45.959083
        },
        "nom_complet": "Ambérieu-en-Bugey",
        "nom": "Ambérieu-en-Bugey",
        "code_postal": "01500",
        "code_insee": "01004",
        "rue": "",
        "numero": "",
        "commune": "Ambérieu-en-Bugey",
        "commune_ancienne": "",
        "contexte": "01, Ain, Auvergne-Rhône-Alpes",
        "departement_numero": "01",
        "departement": "Ain",
        "region": "Auvergne-Rhône-Alpes",
        "type": "municipality"
      },
      "telephone": [],
      "courriel": []
    },
    "objet": "comité de promotion de la région d'Ambérieu en Bugey pour l'implantation d'une plate-forme de ferroutage ; échange et diffusion d'informations, promotion et valorisation des atouts locaux, soutien à la multimodalité"
  }
}
```
{% endtab %}
{% endtabs %}

## Liste des champs d'un établissement

Les différentes routes renvoient les informations suivantes (elles peuvent être manquantes quand elles ne sont pas renseignées)

| `_id`                   | Identifiant de l'établissement                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `rna`                   | Identifiant RNA                                                                               |
| `name`                  | Nom de l'association                                                                          |
| `regime`                | Exemple : "loi1901"                                                                           |
| `theme`                 | Exemple : "Sport", "Environnement et patrimoine", "Loisirs et vie sociale"                    |
| `famille`               | Exemple : "préservation du patrimoine", "Sports, activités de plein air"                      |
| `commune`               | Exemple: "Nantes", "Paris"                                                                    |
| `objet`                 | Objet de l'association (texte descriptif)                                                     |
| `coordonnees`           | (Objet) Coordonnées de l'association (voir exemples au dessus)                                |
| `logo`                  | URL vers le logo de l'association (PNG, JPEG)                                                 |
| `url`                   | URL vers le site de l'association                                                             |
| `linkedin`              | URL vers la page linkedIn de l'association                                                    |
| `facebook`              | URL vers la page facebook de l'association                                                    |
| `twitter`               | URL vers la page twitter de l'association                                                     |
| `donation`              | URL vers le site de donation                                                                  |
| `domaines`              | Liste des domaines de l'association (ex: "Protection de la nature", "Mémoire et citoyenneté") |
| `publics_beneficiaires` | Publics visés (ex: "Tous publics")                                                            |
| `statut_juridique`      | Statut juridique                                                                              |
| `description`           | Description de l'association                                                                  |
| `score`                 | Score (uniquement dans le cas d'une recherche)                                                |
