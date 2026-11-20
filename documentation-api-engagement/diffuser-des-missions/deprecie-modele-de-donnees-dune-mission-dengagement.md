---
description: >-
  Cette page décrit le modèle de données d'une mission récupérée via l'API
  Engagement
hidden: true
---

# Déprécié -  Modèle de données d'une mission d'engagement

## Structure des missions retournées

Les missions retournées respectent le **modèle de données standard de l’API Engagement**.

👉 [Voir : documentation "Récupérer des missions"](https://app.gitbook.com/s/ubkRP59ZFCzK5T16bZo1/mission-mission/recuperer)

## Champs principaux

| Nom du champs    | Type     | Description                                                                   |
| ---------------- | -------- | ----------------------------------------------------------------------------- |
| `title`          | `String` | Titre de votre mission. <mark style="color:red;">**Requis**</mark>            |
| `clientId`       | `String` | Identifiant de la mission. <mark style="color:red;">**Requis**</mark>         |
| `applicationUrl` | `String` | Lien de candidature de la mission. <mark style="color:red;">**Requis**</mark> |
| `postedAt`       | `Date`   | Date à laquelle la mission a été postée. Défaut `now()`                       |
| `startAt`        | `Date`   | Date de début de la mission. Défaut `now()`                                   |
| `endAt`          | `Date`   | Date de fin de la mission                                                     |

## Caractéristiques de la mission

<table><thead><tr><th width="255.2265625">Nom du champs</th><th width="182.7073974609375">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>description</code></td><td><code>String</code></td><td>La description de votre mission, peut contenir des balises HTML. <mark style="color:red;"><strong>Requis</strong></mark></td></tr><tr><td><code>type</code></td><td><code>String</code></td><td>Le type de la mission. <br><br><strong>Valeurs possibles :</strong> <code>"benevolat"</code> <code>"volontariat-service-civique</code></td></tr><tr><td><code>domain</code> </td><td><code>String</code></td><td><p>Domaine de la mission.</p><p></p><p><strong>1 valeurs possible parmi :</strong></p><p><code>"environnement",</code></p><p><code>"solidarite-insertion",</code></p><p><code>"prevention-protection",</code></p><p><code>"sante",</code></p><p><code>"culture-loisirs",</code></p><p><code>"education",</code></p><p><code>"emploi",</code></p><p><code>"sport",</code></p><p><code>"humanitaire",</code></p><p><code>"animaux",</code></p><p><code>"vivre-ensemble",</code></p><p><code>"autre",</code></p><p><code>"memoire-et-citoyennete", ou</code></p><p><code>"benevolat-competences"</code></p></td></tr><tr><td><code>activity</code></td><td><code>String</code></td><td><p>Activités de la mission.</p><p></p><p><strong>1 valeur possible parmi :</strong><br><code>"accueil-de-public"</code>,<br><code>"aide-psychologique"</code>,<br><code>"activites-manuelles"</code>,<br><code>"alphabetisation"</code>,<br><code>"animation"</code>,<br><code>"Animation, Valorisation"</code>,<br><code>"art"</code>,<br><code>"autre"</code>,<br><code>"bricolage"</code>,<br><code>"collecte"</code>,<br><code>"communication"</code>,<br><code>"comptabilite-finance"</code>,<br><code>"conseil"</code>,<br><code>"distribution"</code>,<br><code>"documentation-traduction"</code>,<br><code>"ecoute-permanence"</code>,</p><p><code>"encadrement-d-equipes"</code> ,</p><p><code>"enseignement-formation"</code>,</p><p><code>"gestion-de-projets"</code>,<br><code>"gestion-recherche-des-partenariats"</code>,<br><code>"informatique"</code>,<br><code>"jardinage"</code>,<br><code>"juridique"</code>,<br><code>"logistique"</code>,<br><code>"lutte-contre-isolement"</code>,<br><code>"Médiation, Information"</code>,<br><code>"mentorat-parrainage"</code>,<br><code>"mission-internationale"</code>,<br><code>"Préservation, Patrimoine"</code>,<br><code>"Prévention, Sensibilisation"</code>,<br><code>"ramassage-dechets"</code>,<br><code>"recrutement"</code>,<br><code>"responsabilites-associatives</code>,<br><code>"sante-soins"</code>,<br><code>"Secours, Aide"</code>,<br><code>"secourisme"</code>,<br><code>"sensibilisation"</code>,<br><code>"soins-animaux"</code>,<br><code>"Soutien, Accompagnement"</code>,<br><code>"soutien-scolaire"</code>,<br><code>"sport"</code>,<br><code>"taches-administratives"</code>,<br><code>"Transmission, Pédagogie"</code>,<br><code>"visites"</code></p></td></tr><tr><td><code>domainLogo</code></td><td><code>String</code></td><td>Lien url utilisable sur votre site pour illustrer la mission.</td></tr><tr><td><code>schedule</code></td><td><code>String</code></td><td>Rythme de la mission.<br><br><strong>Exemple</strong> : "1 demi-journée par semaine"</td></tr><tr><td><code>audience</code></td><td><code>String[]</code></td><td>Les bénéficiaires de la mission</td></tr><tr><td><code>softSkills</code></td><td><code>String[]</code></td><td>Les compétences générales requises pour la mission</td></tr><tr><td><code>remote</code></td><td><code>String</code></td><td><p>Mission disponible en distanciel.</p><p></p><p><strong>Valeurs possibles:</strong></p><p><code>"possible"</code>, <code>"full"</code> ou <code>"no"</code></p></td></tr><tr><td><code>reducedMobilityAccessible</code></td><td><code>String</code></td><td><p>Mission accessible pour les personnes à mobilité réduite. </p><p></p><p><strong>Valeurs possibles:</strong></p><p><code>"yes"</code> ou <code>"no"</code></p></td></tr><tr><td><code>closeToTransport</code></td><td><code>String</code></td><td><p>Mission proche des transports en commun.</p><p></p><p><strong>Valeurs possibles:</strong></p><p><code>"yes"</code> ou <code>"no"</code></p></td></tr><tr><td><code>openToMinors</code></td><td><code>String</code></td><td><p>Mission ouverte aux mineurs.</p><p> </p><p><strong>Valeurs possibles:</strong></p><p><code>"yes"</code> ou <code>"no"</code></p></td></tr><tr><td><code>priority</code></td><td><code>String</code></td><td>Priorité de la mission</td></tr><tr><td><code>tags</code></td><td><code>String[]</code></td><td>Ce champs permet de tagguer vos missions avec un, ou plusieurs mots-clés personnalisés séparés par une virgule, dans l’API.<br><br>Exemple 1: <code>"Ecologie"</code><br>Exemple 2: <code>"Ecologie, Sport, Solidarité"</code></td></tr><tr><td><code>metadata</code></td><td><code>String</code></td><td>Métadata de la mission</td></tr><tr><td><code>places</code></td><td><code>Number</code></td><td>Nombre de places de la mission</td></tr></tbody></table>

## Champs géographiques de la mission

Il s’agit de l’ensemble des localisations où se déroulent la mission :&#x20;

* Si les missions se tiennent dans plusieurs lieux alors ces localisations se trouveront dans le champs `addresses` qui est un tableau d'objects contenant le détail géographique de chaque mission.
* Si vos missions ne se tiennent dans un lieu unique, vous ne renseignez qu'une seule adresse dans le tableau `addresses`.
* Dans le cas o**ù la mission n'a aucune adresse (cas notamment des missions à distance /remote), ce tableau sera vide.**

_Exemple d'une mission avec une adresse unique_

```json
{
  "addresses": [
    {
      "street": "10 rue de la Paix",
      "city": "Paris",
      "postalCode": "75001",
      "departmentName": "Paris",
      "departmentCode": "75",
      "region": "Île-de-France",
      "country": "FR",
      "location": {
        "lat": 48.8698,
        "lon": 2.3322
      },
      "_id": "67b5d2814870a4e36c06edde"
    }
  ]
}
```

_Exemple d'une mission avec plusieurs adresses_

```json
{
  "addresses": [
    {
      "street": "10 rue de la Paix",
      "city": "Paris",
      "postalCode": "75001",
      "departmentName": "Paris",
      "departmentCode": "75",
      "region": "Île-de-France",
      "country": "FR",
      "location": {
        "lat": 48.8698,
        "lon": 2.3322
      },
      "_id": "67b5d2814870a4e36c06edde"
    },
    {
      "street": "20 rue Victor Hugo",
      "city": "Lille",
      "postalCode": "59000",
      "departmentName": "Nord",
      "departmentCode": "59",
      "region": "Hauts-de-France",
      "country": "FR",
      "location": {
        "lat": 50.6292,
        "lon": 3.0573
      },
      "_id": "67b5d2814870a4e36c06ede0"
    }
  ]
}
```

| Nom du champ | Type               | Description                                                                                                                                                      |
| ------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| addresses    | `Array of Address` | <p>Tableau des adresses où se déroulent la mission. Chaque objet représente une adresse distincte.<br><br><br>Veuillez vous référer au tableau ci-dessous ⬇️</p> |

Une adresse se compose des champs suivants :&#x20;

| Nom du champs    | Type     | Description                                                                                                 |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `street`         | `String` | <p>Rue où se déroule la mission.<br><br>Exemple: <code>46 Rue Saint-Antoine</code></p>                      |
| `city`           | `String` | <p>Ville où se déroule la mission<br><br>Exemple: <code>Paris</code> </p>                                   |
| `postalCode`     | `String` | <p>Code postal où se déroule la mission<br><br>Exemple: <code>75004</code></p>                              |
| `departmentCode` | `String` | <p>Numéro de département où se déroule la mission.<br><br>Exemple: <code>75</code></p>                      |
| `departmentName` | `String` | Nom du département où se déroule la mission                                                                 |
| `region`         | `String` | Région où se déroule la mission                                                                             |
| `location`       | `Object` | Composé de `lat` et `lon` de type `Number` représentant la latitude et longitude de l'adresse de la mission |

## Champs de l'organisation ou de la structure d'accueil

<table><thead><tr><th width="291">Nom du champs</th><th width="156">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>organizationName</code></td><td><code>String</code></td><td>Nom de l'organisation de la mission</td></tr><tr><td><code>organizationRNA</code></td><td><code>String</code></td><td>RNA de l'organisation de la mission <mark style="color:red;"><strong>Requis (ou organizationSiren)</strong></mark></td></tr><tr><td><code>organizationSiren</code></td><td><code>String</code></td><td>Siren de l'organisation de la mission <mark style="color:red;"><strong>Requis (ou organizationRNA)</strong></mark></td></tr><tr><td><code>organizationUrl</code></td><td><code>String</code></td><td>Lien de l'organisation de la mission</td></tr><tr><td><code>organizationLogo</code></td><td><code>String</code></td><td>Lien de l'image de l'organisation de la mission</td></tr><tr><td><code>organizationDescription</code></td><td><code>String</code></td><td>Description de l'organisation de la mission</td></tr><tr><td><code>organizationClientId</code></td><td><code>String</code></td><td>Identifiant de l'organisation de la mission</td></tr><tr><td><code>organizationStatusJuridique</code></td><td><code>String</code></td><td>Statut juridique de l'organisation de la mission</td></tr><tr><td><code>organizationType</code></td><td><code>String</code></td><td>Type de l'organisation de la mission</td></tr><tr><td><code>organizationActions</code></td><td><code>String[]</code></td><td>Actions de l'organisation de la mission</td></tr><tr><td><code>organizationFullAddress</code></td><td><code>String</code></td><td>Adresse de l'organisation de la mission</td></tr><tr><td><code>organizationPostCode</code></td><td><code>String</code></td><td>Code postal de l'organisation de la mission</td></tr><tr><td><code>organizationCity</code></td><td><code>String</code></td><td>Ville de l'organisation de la mission</td></tr><tr><td><code>organizationBeneficiaries</code></td><td><code>String[]</code></td><td>Bénéficiaires de l'organisation de la mission</td></tr><tr><td><code>organizationReseaux</code></td><td><code>String[]</code></td><td>Réseau de l'organisation de la mission</td></tr></tbody></table>

## Champs d'indemnisation

<table><thead><tr><th width="291">Nom du champ</th><th width="156">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>compensationAmount</code></td><td><code>Number</code></td><td>Montant de l'indemnisation</td></tr><tr><td><code>compensationUnit</code></td><td><code>String</code></td><td><p>Période d'indemnisation pour le montant fourni<br><br><strong>Valeurs possibles:</strong></p><p><code>"hour"</code>, <code>"day"</code>, <code>"month"</code>, <code>"year"</code></p></td></tr><tr><td><code>compensationType</code></td><td><code>String</code></td><td><p>Type d'indemnisation (brute ou nette). <br><br><strong>Valeurs possibles:</strong></p><p><code>"gross"</code>, <code>"net"</code></p></td></tr></tbody></table>

**Exemple :**&#x20;

Pour une indemnisation de 10 € brut de l'heure, renseignez :&#x20;

* `compensationAmount`: `10`
* `compensationUnit`: `"hour"`
* `compensationType`: `"gross"`

## Champs vérifiés et ajoutés par l'API Engagement

1. L'API Engagement les champs suivants pour chaque mission reçue :

| Nom du champs     | Type      | Description                                                                   |
| ----------------- | --------- | ----------------------------------------------------------------------------- |
| `createdAt`       | `Date`    | Date de création de la mission dans l’API                                     |
| `deletedAt`       | `Date`    | <p>Date à laquelle la mission à été effacée. <br>Défaut <code>null</code></p> |
| `deleted`         | `Boolean` | Si la mission est effacée. Défaut `false`                                     |
| `descriptionHtml` | `String`  | Description originale contenant possiblement des balises HTML                 |
| `duration`        | `String`  | Durée de la mission, soit la difference entre `startAt` et `endAt`            |
| `_id`             | `String`  | Identifiant de la mission                                                     |
| `lastSyncAt`      | `Date`    | Date de début de la dernière mise à jour du flux                              |
| `publisherId`     | `String`  | Id du partenaire (vous) annonceur de la mission                               |
| `publisherName`   | `String`  | Nom du partenaire (vous) annonceur de la mission                              |
| `publisherUrl`    | `String`  | URL du partenaire (vous) annonceur de la mission                              |
| `publisherLogo`   | `String`  | Logo du partenaire (vous) annonceur de la mission                             |
| `statusCode`      | `String`  | Statut de modération de la mission.`“ACCEPTED”`ou `“REFUSED”`                 |
| `statusComment`   | `String`  | Commentaire du statut de la modération                                        |
| `updatedAt`       | `Date`    | Date de création de la dernière mise à jour de la mission                     |

2.  L'API Engagement vérifie les références des organisations lors de l'import des missions des partenaires annonceurs afin de garantir l'exactitude des données.&#x20;



Ce processus repose sur une **base de données interne** d'organisations, mise à jour mensuellement avec les données officielles de **l'INSEE** ainsi que sur un appel vers **l'API Data Subvention pour validation externe** si nécessaire.

L'API Engagement tente d'associer le RNA ou SIRET fourni par le partenaire annonceur avec une organisation existante dans la **base de données interne**. En cas d'absence de correspondance interne, l'API Engagement interroge **l'API Data Subvention** pour valider les informations de l'organisation. si une correspondance est trouvée et validée, **l'organisation est créée dans la base interne avec les informations validées**.

<table><thead><tr><th width="347">Nom du champs</th><th width="133">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>organizationVerificationStatus</code></td><td><code>String</code></td><td>Statut de la vérification de l'organisation.</td></tr><tr><td><code>organizationRNAVerified</code></td><td><code>String</code></td><td>Numéro RNA de l'organisation vérifié</td></tr><tr><td><code>organizationSiretVerified</code></td><td><code>String</code></td><td>Numéro SIRET de l'organisation vérifié</td></tr><tr><td><code>organizationSirenVerified</code></td><td><code>String</code></td><td>Numéro SIREN de l'organisation vérifié</td></tr><tr><td><code>organizationNameVerified</code></td><td><code>String</code></td><td>Nom de l'organisation vérifié</td></tr></tbody></table>

## Modération des partenaires "diffuseur"

Certains diffuseurs de l'API Engagement pratique une modération supplémentaire pour les missions qu'il récupèrent via l'API avant de les diffuser sur leur plateforme.

Dans ce cas, des champs supplémentaires sont ajoutés aux missions afin de connaître le statut de la modération. Tous ces champs suivent le format `moderation_{identifiant_du_diffuseur}_{champs}` comme suit et sont accessible par API avec la route [Broken link](/broken/pages/-M_jv6oFRGaxS_l56Ogy "mention"):&#x20;

<table><thead><tr><th width="297">Nom du champ</th><th width="119">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>moderation_{id}_status</code></td><td><code>String</code></td><td><p>Statut de la modération parmi ces valeurs <span data-gb-custom-inline data-tag="emoji" data-code="1f44d">👍</span></p><ul><li><code>ACCEPTED</code>: mission acceptée</li><li><code>REFUSED</code>: mission refusée</li><li><code>PENDING</code>: mission en attente de modération</li><li><code>ONGOING</code>: mission en cours de modération</li></ul></td></tr><tr><td><code>moderation_{id}_comment</code></td><td><code>String</code></td><td>Motif du refus si la mission est refusée</td></tr><tr><td><code>moderation_{id}_title</code></td><td><code>String</code></td><td>Si le titre est modifié, nouveau titre choisi par le partenaire</td></tr></tbody></table>

Ces informations sont également visibles dans le dashboard "Partager des Missions" > Flux de Mission

<figure><img src="../.gitbook/assets/image (7).png" alt=""><figcaption></figcaption></figure>

### Exemple de modération

```json
// Mission refusée
{
    "title": "La meilleure mission de bénévolat",
    "startAt": "2012-12-21T00:00:00.000Z"
    ...
    "moderation_5f5931496c7ea5xxxxxxxxxx_comment": "La mission est refusée car la date de création est trop ancienne (> 6 mois)",
    "moderation_5f5931496c7ea5xxxxxxxxxx_status": "REFUSED",
    "moderation_5f5931496c7ea5xxxxxxxxxx_title": ""
}
// Mission acceptée
{
        "title": "La meilleure mission de bénévolat",
    ...
    "moderation_5f5931496c7eaxxxxxxxxxxx_comment": "",
    "moderation_5f5931496c7eaxxxxxxxxxxx_status": "ACCEPTED",
    "moderation_5f5931496c7eaxxxxxxxxxxx_title": "L'une des meilleures mission de bénévolat"
}
```
